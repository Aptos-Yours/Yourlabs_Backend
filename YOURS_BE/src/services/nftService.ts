import { Result } from 'express-validator';
import { createNftDto } from './../interfaces/user/DTO';
import { PrismaClient } from '@prisma/client';
import errorGenerator from '../middlewares/error/errorGenerator';
import { statusCode, responseMessage } from '../modules/constants';
import config from '../config';
import { s3ForConvertFile } from '../config/s3Config';
import { Blob } from 'buffer';
import fs from 'fs';
const prisma = new PrismaClient();

const getInfoByType = async (userId: number, type: string) => {
  try {
    switch (type) {
      case 'own': {
        const nftsInfo = await prisma.user_has_nfts.findMany({
          where: {
            userId: userId,
          },
          select: {
            nftId: true,
            nfts: {
              select: {
                id: true,
                nftName: true,
                image: true,
                reward: true,
              },
            },
          },
        });

        const data = await Promise.all(
          nftsInfo.map((nftInfo: any) => {
            const result = {
              id: nftInfo.nftId,
              nftName: nftInfo.nfts.nftName,
              image: nftInfo.nfts.image,
              rewards: nftInfo.nfts.reward.length,
            };
            return result;
          }),
        );
        return data;
      }
      case 'reward': {
        const nftsRewardInfo = await prisma.user_has_nfts.findMany({
          where: {
            userId: userId,
          },
          select: {
            nftId: true,
            nfts: {
              select: {
                id: true,
                nftName: true,
                reward: {
                  select: {
                    id: true,
                    rewardName: true,
                  },
                },
              },
            },
          },
        });
        const data = await Promise.all(
          nftsRewardInfo.map((nftRewardInfo: any) => {
            const result = {
              id: nftRewardInfo.nftId,
              nftName: nftRewardInfo.nfts.nftName,
              rewards: nftRewardInfo.nfts.reward,
            };
            return result;
          }),
        );
        return data;
      }
      case 'create': {
        const ownNftsInfo = await prisma.nfts.findMany({
          where: {
            ownerId: userId,
          },
          select: {
            id: true,
            nftName: true,
            image: true,
            reward: true,
          },
        });
        const data = await Promise.all(
          ownNftsInfo.map((ownNftInfo: any) => {
            const result = {
              id: ownNftInfo.id,
              nftName: ownNftInfo.nftName,
              image: ownNftInfo.image,
              rewards: ownNftInfo.reward.length,
            };
            return result;
          }),
        );
        return data;
      }
      default:
        throw errorGenerator({
          msg: responseMessage.NOT_FOUND,
          statusCode: statusCode.NOT_FOUND,
        });
    }
  } catch (error) {
    throw error;
  }
};

const getNftDetailInfo = async (nftId: number) => {
  try {
    const getNftOwners = await prisma.user_has_nfts.findMany({
      where: {
        nftId,
      },
    });
    const getDetailData = await prisma.nfts.findFirst({
      where: {
        id: nftId,
      },
      include: {
        reward: {
          select: {
            id: true,
            rewardName: true,
          },
        },
      },
    });

    const data = {
      id: getDetailData?.id,
      nftName: getDetailData?.nftName,
      image: getDetailData?.image,
      numberOfOwners: getNftOwners.length,
      description: getDetailData?.description,
      numberOfRewards: getDetailData?.reward.length,
      rewards: getDetailData?.reward,
      authType: getDetailData?.authType,
      options: getDetailData?.options,
    };

    if (!data.id) {
      throw errorGenerator({
        msg: responseMessage.NOT_FOUND,
        statusCode: statusCode.NOT_FOUND,
      });
    }
    return data;
  } catch (error) {
    throw error;
  }
};

const getNftOwnersInfo = async (nftId: number) => {
  try {
    const getNftOwners = await prisma.user_has_nfts.findMany({
      where: {
        nftId: nftId,
      },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            profileImage: true,
          },
        },
      },
    });
    const data = await Promise.all(
      getNftOwners.map((getNftOwner: any) => {
        const result = {
          user: {
            id: getNftOwner.user.id,
            name: getNftOwner.user.name,
            profileImage: getNftOwner.user.profileImage,
          },
        };
        return result;
      }),
    );
    return data;
  } catch (error) {
    throw error;
  }
};

const createNft = async (createNftDto: createNftDto) => {
  try {
    const data = await prisma.nfts.create({
      data: {
        ownerId: createNftDto.ownerId,
        nftName: createNftDto.nftName,
        image: createNftDto.image,
        description: createNftDto.description,
        authType: createNftDto.authType,
        options: createNftDto.options,
      },
    });
    return data;
  } catch (error) {
    throw error;
  }
};

const verifyMailForNft = async (userId: number, nftId: number) => {
  try {
    const data = await prisma.user_has_nfts.create({
      data: {
        userId: userId,
        nftId: nftId,
      },
    });
    return data;
  } catch (error) {
    throw error;
  }
};

const getOwnNftList = async (userId: number) => {
  try {
    const nftsList = await prisma.user_has_nfts.findMany({
      where: {
        userId: userId,
      },
      select: {
        nftId: true,
      },
    });
    const data = await Promise.all(
      nftsList.map((nftList: any) => nftList.nftId),
    );
    return data;
  } catch (error) {
    throw error;
  }
};
const getCreateNftList = async (userId: number) => {
  try {
    const nftsList = await prisma.nfts.findMany({
      where: {
        ownerId: userId,
      },
      select: {
        id: true,
      },
    });
    const data = await Promise.all(nftsList.map((nftList: any) => nftList.id));
    return data;
  } catch (error) {
    throw error;
  }
};

const verifyPhotoForNft = async (
  userId: number,
  nftId: number,
  location: string,
) => {
  try {
    const data = await prisma.admin.create({
      data: {
        userId: userId,
        nftId: nftId,
        image: location,
      },
    });
    return data;
  } catch (error) {
    throw error;
  }
};

const getRequestAuthPhoto = async (userId: number, nftId: number) => {
  try {
    const data = await prisma.admin.findFirst({
      where: {
        userId,
        nftId,
      },
    });
    if (!data) {
      return false;
    }
    return true;
  } catch (error) {
    throw error;
  }
};

const createReward = async (
  userId: number,
  nftId: number,
  rewardName: string,
  description: string,
) => {
  try {
    const findCreaterNft = await prisma.nfts.findFirst({
      where: {
        id: nftId,
        ownerId: userId,
      },
    });
    if (!findCreaterNft) {
      throw errorGenerator({
        msg: responseMessage.NOT_NFT_CREATER,
        statusCode: statusCode.BAD_REQUEST,
      });
    }
    const data = await prisma.reward.create({
      data: {
        nftId,
        rewardName,
        description,
      },
    });

    return data;
  } catch (error) {
    throw error;
  }
};

const updateRewardInfo = async (
  userId: number,
  nftId: number,
  rewardId: number,
  rewardName: string,
  description: string,
) => {
  try {
    const findCreaterNft = await prisma.nfts.findFirst({
      where: {
        id: nftId,
        ownerId: userId,
      },
    });
    if (!findCreaterNft) {
      throw errorGenerator({
        msg: responseMessage.NOT_NFT_CREATER,
        statusCode: statusCode.BAD_REQUEST,
      });
    }

    await prisma.reward.update({
      where: {
        id: rewardId,
      },
      data: {
        rewardName,
        description,
      },
    });
  } catch (error) {
    throw error;
  }
};
const getNftRewardDetailInfo = async (rewardId: number) => {
  try {
    const getRewardDetailInfo = await prisma.reward.findFirst({
      where: {
        id: rewardId,
      },
    });
    if (!getRewardDetailInfo) {
      return null;
    }
    const data = {
      rewardName: getRewardDetailInfo.rewardName,
      description: getRewardDetailInfo.description,
    };
    return data;
  } catch (error) {
    throw error;
  }
};
const existNftAddress = async (nftId: number) => {
  try {
    const findNft = await prisma.nfts.findFirst({
      where: {
        id: nftId,
      },
    });
    if (!findNft) {
      throw errorGenerator({
        msg: responseMessage.READ_NFT_FAIL,
        statusCode: statusCode.BAD_REQUEST,
      });
    }
    if (findNft.nftAddress == null) {
      return null;
    }
    return findNft.nftAddress;
  } catch (error) {
    throw error;
  }
};

const saveNftAddress = async (nftId: number, deployedNft: string) => {
  try {
    await prisma.nfts.update({
      where: {
        id: nftId,
      },
      data: {
        nftAddress: deployedNft,
      },
    });
  } catch (error) {
    throw error;
  }
};

const convertURLtoFile = async (nftId: number) => {
  try {
    const data = await prisma.nfts.findFirst({
      where: {
        id: nftId,
      },
    });
    if (!data) {
      throw errorGenerator({
        msg: responseMessage.BAD_REQUEST,
        statusCode: statusCode.BAD_REQUEST,
      });
    }
    const imageURL = data?.image;
    if (!imageURL) {
      throw errorGenerator({
        msg: responseMessage.NO_IMAGE,
        statusCode: statusCode.BAD_REQUEST,
      });
    }

    //* 파일 데이터 가공
    const fileKey = imageURL?.split('/').pop();
    if (!fileKey) {
      throw errorGenerator({
        msg: responseMessage.BAD_REQUEST,
        statusCode: statusCode.BAD_REQUEST,
      });
    }
    const params = {
      Bucket: config.bucketName,
      Key: fileKey,
    };

    s3ForConvertFile.getObject(params, (error, data) => {
      if (error) {
        throw error;
      }
      // console.log(data);
      // const blob = new Blob([JSON.stringify(data.Body)], {
      //   type: data.ContentType,
      // });
      // // const file = new File([blob], fileKey);
      // // console.log(file);
    });
  } catch (error) {
    throw error;
  }
};

const deleteNftReward = async (
  userId: number,
  nftId: number,
  rewardId: number,
) => {
  try {
    const findCreaterNft = await prisma.nfts.findFirst({
      where: {
        id: nftId,
        ownerId: userId,
      },
    });
    if (!findCreaterNft) {
      throw errorGenerator({
        msg: responseMessage.NOT_NFT_CREATER,
        statusCode: statusCode.BAD_REQUEST,
      });
    }
    await prisma.reward.delete({
      where: {
        id: rewardId,
      },
    });
  } catch (error) {
    throw error;
  }
};

const updateNftFlag = async (userId: number, nftId: number) => {
  await prisma.user_has_nfts.update({
    where: {
      userId_nftId: { userId, nftId },
    },
    data: {
      isMoved: true,
    },
  });
};

const getNftInfo = async (nftId: number) => {
  const data = await prisma.nfts.findFirst({
    where: {
      id: nftId,
    },
  });
  if (!data) {
    throw errorGenerator({
      msg: responseMessage.BAD_REQUEST,
      statusCode: statusCode.BAD_REQUEST,
    });
  }
  return data;
};

const getNftMoveFlagList = async (userId: number) => {
  const getNftMoveFlag = await prisma.user_has_nfts.findMany({
    where: {
      userId,
      isMoved: true,
    },
  });
  const result = await Promise.all(
    getNftMoveFlag.map((trueFlag: any) => trueFlag.nftId),
  );
  return result;
};

export default {
  getInfoByType,
  getNftDetailInfo,
  getNftOwnersInfo,
  createNft,
  verifyMailForNft,
  getOwnNftList,
  getCreateNftList,
  verifyPhotoForNft,
  getRequestAuthPhoto,
  createReward,
  updateRewardInfo,
  getNftRewardDetailInfo,
  existNftAddress,
  saveNftAddress,
  convertURLtoFile,
  deleteNftReward,
  updateNftFlag,
  getNftInfo,
  getNftMoveFlagList,
};
