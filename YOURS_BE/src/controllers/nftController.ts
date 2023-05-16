import { createNftDto, userInfo } from './../interfaces/user/DTO';
import { Request, Response, NextFunction } from 'express';
import { responseMessage, statusCode } from '../modules/constants';
import { success, fail } from '../modules/constants/util';
import nftService from '../services/nftService';
import { sendMail } from '../modules/mail';
import { saveMailAuthCode, verifyCode } from '../modules/code';
import { decodeByAES256, encodeByAES56 } from '../modules/crypto';
import { uploadBenefitIpfs, uploadMetaIpfs } from '../contract/ipfs';
import config from '../config/index';
import { deployAptosNFT, mintAptosNFT } from '../contract/aptosContract';

const ethers = require('ethers');

const provider = new ethers.providers.getDefaultProvider(`${config.aptosRPC}`);

const walletObj = new ethers.Wallet(config.walletSecretKey);
const wallet = walletObj.connect(provider);

const deployed = require('../contract/deployed-address.json');
const factoryAdd = deployed.YoursFactory;
const factoryData = require('../contract/YoursFactory.json');
const benefitData = require('../contract/YoursBenefitNFT.json');
const contract = new ethers.Contract(factoryAdd, factoryData.abi, provider);

/**
 * [GET] 카테고리 별 정보 조회
 */
const getInfoByType = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.body.id;
  const { type } = req.query;
  try {
    const data = await nftService.getInfoByType(+userId, type as string);
    return res
      .status(statusCode.OK)
      .send(
        success(
          statusCode.OK,
          responseMessage.READ_CATEGORY_INFO_SUCCESS,
          data,
        ),
      );
  } catch (error) {
    next(error);
  }
};

/**
 * [GET] NFT 상세 페이지 조회
 */
const getNftDetailInfo = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { nftId } = req.params;

  try {
    const data = await nftService.getNftDetailInfo(+nftId);
    if (!data) {
      return res
        .status(statusCode.NOT_FOUND)
        .send(fail(statusCode.NOT_FOUND, responseMessage.NOT_FOUND));
    }
    return res
      .status(statusCode.OK)
      .send(
        success(
          statusCode.OK,
          responseMessage.READ_NFT_DETAIL_INFO_SUCCESS,
          data,
        ),
      );
  } catch (error) {
    next(error);
  }
};

/**
 * [GET] NFT 소유자 정보 조회
 */
const getNftOwnersInfo = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { nftId } = req.params;
  try {
    const data = await nftService.getNftOwnersInfo(+nftId);

    return res
      .status(statusCode.OK)
      .send(
        success(
          statusCode.OK,
          responseMessage.READ_NFT_OWNERS_INFO_SUCCESS,
          data,
        ),
      );
  } catch (error) {
    console.log(error);
    next(error);
  }
};

/**
 * [POST] NFT 생성
 */
const createNft = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.body.id;
  const image: Express.MulterS3.File = req.file as Express.MulterS3.File;
  const { location } = image;
  if (!location) {
    res
      .status(statusCode.BAD_REQUEST)
      .send(fail(statusCode.BAD_REQUEST, responseMessage.NO_IMAGE));
  }

  const createNftDto: createNftDto = {
    ownerId: userId,
    nftName: req.body.nftName,
    image: location,
    description: req.body.description,
    authType: +req.body.authType,
    options: req.body.options,
  };

  try {
    const data = await nftService.createNft(createNftDto);

    return res
      .status(statusCode.OK)
      .send(success(statusCode.OK, responseMessage.CREATE_NFT_SUCCESS, data));
  } catch (error) {
    next(error);
  }
};

/**
 * [POST] NFT 이메일 인증메일 발송
 */
const sendAuthMailForNft = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.body.id;
    const { nftId, email } = req.body;

    //* 유저의 정보를 담은 객체 생성
    const userInfo: userInfo = {
      userId: userId,
      nftId: nftId,
      email: email,
    };
    //* 객체를 문자열로 변환
    const codeInfo = JSON.stringify(userInfo);

    //* 암호화된 코드 생성
    const code = await encodeByAES56(codeInfo.toString());
    //* 인증 코드 저장

    await saveMailAuthCode(email, code);

    //* 인증 메일 발송
    await sendMail(code, email);
    return res
      .status(statusCode.OK)
      .send(success(statusCode.OK, responseMessage.SEND_AUTH_MAIL_SUCCESS));
  } catch (error) {
    next(error);
  }
};

/**
 * [POST] NFT 이메일 검증
 */
const verifyMailForNft = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { code } = req.body;

    // userInfo로 암호화된 코드 복호화
    const codeInfo = await decodeByAES256(code);
    //* codeInfo 문자열 객체로 변환
    const userInfo: userInfo = JSON.parse(codeInfo);
    //* 검증
    const verify = await verifyCode(userInfo.email, code);
    if ((await verify) == false) {
      return res
        .status(statusCode.BAD_REQUEST)
        .send(
          fail(statusCode.BAD_REQUEST, responseMessage.VERIFY_EMAIL_AUTH_FAIL),
        );
    }
    const getNftInfo = await nftService.getNftInfo(+userInfo.nftId);
    const messageInfo = await nftService.getUserAndNftInfo(
      +userInfo.userId,
      +getNftInfo.id,
      'NFT_MINTING_SUCCESS',
    );

    const mintNftInfo = await mintAptosNFT(
      getNftInfo.nftName!,
      messageInfo.name!,
    );
    const verifyInfo = await nftService.verifyMailForNft(
      userInfo.userId,
      userInfo.nftId,
      mintNftInfo!.mintId,
    );

    const data = {
      userId: verifyInfo.userId,
      nftId: verifyInfo.nftId,
      transactionHash: mintNftInfo!.mintTxHash,
      date: mintNftInfo!.date,
    };
    return res
      .status(statusCode.OK)
      .send(
        success(statusCode.OK, responseMessage.VERIFY_EMAIL_AUTH_SUCCESS, data),
      );
  } catch (error) {
    next(error);
  }
};

/**
 * [GET] 유저가 받은 NFT ID 리스트 조회
 */
const getOwnNftList = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.body.id;

    const data = await nftService.getOwnNftList(userId);
    return res
      .status(statusCode.OK)
      .send(
        success(statusCode.OK, responseMessage.READ_NFT_ID_LIST_SUCCESS, data),
      );
  } catch (error) {
    next(error);
  }
};

const getCreateNftList = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.body.id;
    const data = await nftService.getCreateNftList(userId);
    return res
      .status(statusCode.OK)
      .send(
        success(
          statusCode.OK,
          responseMessage.READ_CREATE_NFT_ID_LIST_SUCCESS,
          data,
        ),
      );
  } catch (error) {
    next(error);
  }
};

const verifyPhotoForNft = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.body.id;
  const { nftId } = req.body;
  const image: Express.MulterS3.File = req.file as Express.MulterS3.File;
  const { location } = image;
  if (!location) {
    res
      .status(statusCode.BAD_REQUEST)
      .send(fail(statusCode.BAD_REQUEST, responseMessage.NO_IMAGE));
  }
  try {
    const data = await nftService.verifyPhotoForNft(+userId, +nftId, location);

    return res
      .status(statusCode.OK)
      .send(
        success(statusCode.OK, responseMessage.SEND_AUTH_PHOTO_SUCCESS, data),
      );
  } catch (error) {
    next(error);
  }
};

//* [GET] NFT 사진 인증 여부 조회

const getRequestAuthPhoto = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.body.id;
    const { nftId } = req.params;

    const data = await nftService.getRequestAuthPhoto(+userId, +nftId);

    return res
      .status(statusCode.OK)
      .send(
        success(
          statusCode.OK,
          responseMessage.READ_GET_REQUEST_PHOTO_SUCCESS,
          data,
        ),
      );
  } catch (error) {
    next(error);
  }
};

//* [POST] NFT 혜택 생성

const createReward = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.body.id;
    const { nftId } = req.params;
    const { rewardName, description } = req.body;
    const data = await nftService.createReward(
      userId,
      +nftId,
      rewardName,
      description,
    );

    return res
      .status(statusCode.CREATED)
      .send(
        success(
          statusCode.CREATED,
          responseMessage.CREATE_NFT_REWARD_SUCCESS,
          data,
        ),
      );
  } catch (error) {
    next(error);
  }
};

//* [PATCH] NFT 혜택 수정
const updateRewardInfo = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.body.id;
    const { nftId } = req.params;
    const { rewardId, rewardName, description } = req.body;
    await nftService.updateRewardInfo(
      userId,
      +nftId,
      +rewardId,
      rewardName,
      description,
    );

    return res
      .status(statusCode.OK)
      .send(success(statusCode.OK, responseMessage.UPDATE_NFT_REWARD_SUCCESS));
  } catch (error) {
    next(error);
  }
};

//* [GET] NFT 혜택 상세보기

const getNftRewardDetailInfo = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { rewardId } = req.params;
    const data = await nftService.getNftRewardDetailInfo(+rewardId);

    return res
      .status(statusCode.OK)
      .send(
        success(
          statusCode.OK,
          responseMessage.READ_NFT_REWARD_DETAIL_INFO_SUCCESS,
          data,
        ),
      );
  } catch (error) {
    next(error);
  }
};

//* [DELETE] NFT 혜택 삭제

const deleteNftReward = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.body.id;
    const { nftId, rewardId } = req.params;
    await nftService.deleteNftReward(userId, +nftId, +rewardId);

    return res
      .status(statusCode.OK)
      .send(success(statusCode.OK, responseMessage.DELETE_NFT_REWARD_SUCCESS));
  } catch (error) {
    next(error);
  }
};

//* [GET] NFT 전달 여부
const getNftMoveFlagList = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.body.id;
    const data = await nftService.getNftMoveFlagList(userId);
    return res
      .status(statusCode.OK)
      .send(
        success(
          statusCode.OK,
          responseMessage.READ_NFT_FLAG_LIST_SUCCESS,
          data,
        ),
      );
  } catch (error) {
    next(error);
  }
};

const publishNFT = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.body.id;
  const { nftId } = req.body;
  try {
    //* NFT 생성자인지 확인하기
    const checkNftCreator = await nftService.checkNftCreator(+userId, +nftId);
    if (checkNftCreator) {
      const nftInfo = await nftService.getNftInfoWithReward(+nftId);
      const nftInfoIpfs = await uploadMetaIpfs(
        nftInfo.nftName,
        nftInfo.description,
        nftInfo.image,
      );

      await nftService.checkDeployedState(+nftId);

      const benefitInfoIpfs = await uploadBenefitIpfs(nftInfo.benefit);
      await nftService.startLoading(+nftId);
      const data = await deployAptosNFT(
        nftInfo.nftName!,
        nftInfoIpfs,
        benefitInfoIpfs,
      );

      await nftService.updateNftInfo(
        +nftId,
        data.address.toString(),
        data.date,
      );
      await nftService.equalReward(+nftId);
      await nftService.finishLoading(+nftId);
      return res
        .status(statusCode.OK)
        .send(
          success(statusCode.OK, responseMessage.PUBLISH_NFT_SUCCESS, data),
        );
    }
  } catch (error) {
    next(error);
  }
};
export default {
  getInfoByType,
  getNftDetailInfo,
  getNftOwnersInfo,
  createNft,
  sendAuthMailForNft,
  verifyMailForNft,
  getOwnNftList,
  getCreateNftList,
  verifyPhotoForNft,
  getRequestAuthPhoto,
  createReward,
  updateRewardInfo,
  getNftRewardDetailInfo,
  deleteNftReward,
  getNftMoveFlagList,
  publishNFT,
};
