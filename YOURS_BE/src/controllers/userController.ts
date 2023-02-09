import { userCreateDto } from '../interfaces/user/DTO';
import { Request, Response, NextFunction } from 'express';
import {
  exceptionMessage,
  responseMessage,
  statusCode,
} from '../modules/constants';
import { success, fail } from '../modules/constants/util';
import userService from '../services/userService';
import jwt from '../modules/jwtHandler';
import { SocialUser } from '../interfaces/user/SocialUser';
import config from '../config';
import { createAuthCode, verifyCode, saveAuthCode } from '../modules/code';
import makeSignature from '../modules/getSignature';
import axios from 'axios';
import { sendAuthEmail } from '../modules/mail';

/**
 * @desc [POST] 유저 소셜 로그인
 */
const getSocialUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { token } = req.body;

  //* token이 없다면
  if (!token) {
    return res
      .status(statusCode.BAD_REQUEST)
      .send(fail(statusCode.BAD_REQUEST, responseMessage.EMPTY_TOKEN));
  }

  try {
    const user = await userService.getSocialUser(token);

    //* user가 없다면
    if (!user) {
      return res
        .status(statusCode.UNAUTHORIZED)
        .send(fail(statusCode.UNAUTHORIZED, responseMessage.INVALID_TOKEN));
    }
    if (user == exceptionMessage.INVALID_USER) {
      return res
        .status(statusCode.UNAUTHORIZED)
        .send(fail(statusCode.UNAUTHORIZED, responseMessage.NO_USER));
    }
    //* 가입된 유저인지 확인
    const existUser = await userService.findUserById(
      (user as SocialUser).userId,
    );
    if (!existUser) {
      //* 가입되지 않은 유저
      const data = {
        signUp: false,
      };
      return res
        .status(statusCode.OK)
        .send(success(statusCode.OK, responseMessage.SIGNIN_FAIL, data));
    }

    //* 가입된 유저라면 로그인
    const refreshToken = jwt.createRefresh();
    const accessToken = jwt.sign(existUser.id, existUser.email);

    await userService.updateRefreshToken(existUser.id, refreshToken);

    const data = {
      signUp: true,
      accessToken: accessToken,
      refreshToken: refreshToken,
    };

    return res
      .status(statusCode.OK)
      .send(success(statusCode.OK, responseMessage.SIGNIN_SUCCESS, data));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc 유저 회원 가입
 */
const createUser = async (req: Request, res: Response, next: NextFunction) => {
  const userCreateDto: userCreateDto = req.body;
  try {
    const refreshToken = jwt.createRefresh();
    const newUser = await userService.signUpUser(userCreateDto, refreshToken);
    const accessToken = jwt.sign(newUser.id, newUser.email);

    const data = {
      accessToken: accessToken,
      refreshToken: refreshToken,
    };

    return res
      .status(statusCode.OK)
      .send(success(statusCode.OK, responseMessage.SIGNUP_SUCCESS, data));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc [POST] 인증 문자 보내기
 */
const sendAuthMessage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { phoneNumber } = req.body;
  const authCode = createAuthCode();

  try {
    //redis에 key-value 형태로 저장
    await saveAuthCode(phoneNumber, authCode);

    //문자 전송
    await sendMessage(phoneNumber, authCode);

    const data = {
      verifyCode: authCode,
    };

    return res
      .status(statusCode.OK)
      .send(success(statusCode.OK, responseMessage.SEND_MESSAGE_SUCCESS, data));
  } catch (error) {
    next(error);
  }

  /**
   * @desc: 문자를 발송합니다
   * @param phoneNumber
   * @param authCode
   */
  async function sendMessage(phoneNumber: any, authCode: number) {
    const time = Date.now().toString();
    const signature = makeSignature(time);

    // 문자열 배열 || 문자열에 대한 예외처리
    const messages =
      phoneNumber instanceof Array
        ? phoneNumber.map(
            (number) =>
              new Object({
                to: number,
              }),
          )
        : [{ to: phoneNumber }];

    const body = JSON.stringify({
      type: 'SMS',
      countryCode: '82',
      from: config.callNumber,
      content: `[yours] 인증번호 [${authCode}]를 입력해주세요`,
      messages: messages,
    });

    const response = await axios({
      method: 'POST',
      url: `https://sens.apigw.ntruss.com/sms/v2/services/${config.naverCloudServiceId}/messages`,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'x-ncp-apigw-timestamp': time,
        'x-ncp-iam-access-key': `${config.naverCloudSmsAccessKey}`,
        'x-ncp-apigw-signature-v2': signature,
      },
      data: body,
    });

    return response;
  }
};

/**
 * @desc [POST] 인증 코드 검증
 */

const verifyAuthCode = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { authText, authCode } = req.body;

  try {
    const data = await verifyCode(authText, authCode);
    return res
      .status(statusCode.OK)
      .send(
        success(statusCode.OK, responseMessage.VERIFY_AUTH_CODE_SUCCESS, data),
      );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc [GET] 프로필 정보 조회
 */

const getUserInfo = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.body.id;
  try {
    const data = await userService.getUserInfo(+userId);

    if (!data) {
      return res
        .status(statusCode.NOT_FOUND)
        .send(fail(statusCode.NOT_FOUND, responseMessage.NOT_FOUND));
    }
    return res
      .status(statusCode.OK)
      .send(
        success(statusCode.OK, responseMessage.READ_USER_INFO_SUCCESS, data),
      );
  } catch (error) {
    next(error);
  }
};

//* [PATCH] 유저 프로필 사진 수정

const updateProfilePhoto = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.body.id;
  const image: Express.MulterS3.File = req.file as Express.MulterS3.File;
  const { location } = image;
  if (!location) {
    res
      .status(statusCode.BAD_REQUEST)
      .send(fail(statusCode.BAD_REQUEST, responseMessage.NO_IMAGE));
  }
  try {
    const data = await userService.updateProfilePhoto(+userId, location);

    return res
      .status(statusCode.OK)
      .send(
        success(
          statusCode.OK,
          responseMessage.UPDATE_PROFILE_PHOTO_SUCCESS,
          data,
        ),
      );
  } catch (error) {
    next(error);
  }
};

//* [PATCH] 유저의 휴대폰 번호 수정

const updateUserPhoneNumber = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.body.id;
  const { phoneNumber } = req.body;
  try {
    await userService.updateUserPhoneNumber(+userId, phoneNumber);

    return res
      .status(statusCode.OK)
      .send(
        success(statusCode.OK, responseMessage.UPDATE_PHONE_NUMBER_SUCCESS),
      );
  } catch (error) {
    next(error);
  }
};

//* [PATCH] 유저의 이메일 수정 성공

const updateUserEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.body.id;
  const { email } = req.body;
  try {
    await userService.updateUserEmail(+userId, email);
    return res
      .status(statusCode.OK)
      .send(success(statusCode.OK, responseMessage.UPDATE_EMAIL_SUCCESS));
  } catch (error) {
    next(error);
  }
};

//* [PATCH] 유저의 닉네임 수정

const updateNickName = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.body.id;
  const { nickname } = req.body;
  try {
    await userService.updateNickName(+userId, nickname);
    return res
      .status(statusCode.OK)
      .send(success(statusCode.OK, responseMessage.UPDATE_NICKNAME_SUCCESS));
  } catch (error) {
    next(error);
  }
};

//* 유저 이메일 변경을 위한 메일 전송

const sendEmailForAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { email } = req.body;
  const authCode = createAuthCode();
  try {
    await sendAuthEmail(authCode, email);
    await saveAuthCode(email, authCode);
    return res
      .status(statusCode.OK)
      .send(success(statusCode.OK, responseMessage.SEND_AUTH_EMAIL_SUCCESS));
  } catch (error) {
    next(error);
  }
};

export default {
  getSocialUser,
  createUser,
  sendAuthMessage,
  verifyAuthCode,
  getUserInfo,
  updateProfilePhoto,
  updateUserPhoneNumber,
  updateUserEmail,
  updateNickName,
  sendEmailForAuth,
};
