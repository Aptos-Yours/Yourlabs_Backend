import { createNftDto, userInfo } from './../interfaces/user/DTO';
import { Request, Response, NextFunction } from 'express';
import { responseMessage, statusCode } from '../modules/constants';
import { success, fail } from '../modules/constants/util';
import nftService from '../services/nftService';
import { sendMail } from '../modules/mail';
import { saveMailAuthCode, verifyCode } from '../modules/code';
import { decodeByAES256, encodeByAES56 } from '../modules/crypto';
import {
  deployNFT,
  mintNFT,
  uploadImgIpfs,
  uploadMetaIpfs,
} from '../contract/contract';
import config from '../config/index';

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
    const data = await nftService.verifyMailForNft(
      userInfo.userId,
      userInfo.nftId,
    );
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

//* [PATCH] NFT 옮겨가기

const transferNFT = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.body.id;
    const { walletAddress } = req.body;
    const { nftId } = req.params;

    //* 파일 원본 가져오기
    //const originalFile = await nftService.convertURLtoFile(+nftId);

    //* NFT 정보 가져오기
    const getNftInfo = await nftService.getNftInfo(+nftId);

    //* 이미지 파일 및 nft 정보 ipfs에 올리기
    //const image = await uploadImgIpfs(originalFile);

    const nftInfoToIpfs = await uploadMetaIpfs(
      getNftInfo.nftName,
      getNftInfo.description,
      getNftInfo.image,
    );
    //* NFT가 배포되어 있는지 확인
    const existNftAddress = await nftService.existNftAddress(+nftId);

    //* 배포된 NFT가 아니라면, NFT 정보를 가지고 배포 후, 민팅
    if (!existNftAddress) {
      const deployedNft = await deployNFT(getNftInfo.nftName, nftInfoToIpfs);

      //* 배포된 NFT address를 DB에 저장
      await nftService.saveNftAddress(+nftId, deployedNft);

      const nftContract = new ethers.Contract(
        deployedNft,
        benefitData.abi,
        provider,
      );
      //* 민팅
      const data = await mintNFT(nftContract, walletAddress);

      //* 마이페이지에 NFT 상태 변경
      await nftService.updateNftFlag(userId, +nftId);
      return res
        .status(statusCode.OK)
        .send(
          success(statusCode.OK, responseMessage.TRANSFER_NFT_SUCCESS, data),
        );
    }

    //* 배포된 NFT라면, 민팅
    const nftContract = new ethers.Contract(
      existNftAddress,
      benefitData.abi,
      provider,
    );

    const data = await mintNFT(nftContract, walletAddress);

    //* 마이페이지에 NFT 상태 변경
    await nftService.updateNftFlag(userId, +nftId);
    return res
      .status(statusCode.OK)
      .send(success(statusCode.OK, responseMessage.TRANSFER_NFT_SUCCESS, data));
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
  transferNFT,
  deleteNftReward,
  getNftMoveFlagList,
};
