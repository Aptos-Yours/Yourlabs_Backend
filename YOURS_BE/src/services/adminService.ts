import { PrismaClient } from '@prisma/client';
import errorGenerator from '../middlewares/error/errorGenerator';
import { responseMessage, statusCode } from '../modules/constants';
const prisma = new PrismaClient();

const getRequestUser = async (userId: number, nftId: number) => {
  const users = await prisma.admin.findMany({
    where: {
      nfts: {
        ownerId: userId,
      },
      nftId: nftId,
    },
    select: {
      id: true,
      user: {
        select: {
          id: true,
          name: true,
          profileImage: true,
        },
      },
      image: true,
    },
  });
  if (users.length == 0) {
    throw errorGenerator({
      msg: responseMessage.NOT_FOUND,
      statusCode: statusCode.NOT_FOUND,
    });
  }
  const data = await Promise.all(
    users.map((user: any) => {
      const result = {
        id: user.id,
        userId: user.user.id,
        name: user.user.name,
        profileImage: user.user.profileImage,
        image: user.image,
      };

      return result;
    }),
  );
  return data;
};

const approveNft = async (id: number) => {
  try {
    const findUserIdAndNftId = await prisma.admin.findFirst({
      where: {
        id,
      },
      select: {
        userId: true,
        nftId: true,
      },
    });
    if (!findUserIdAndNftId) {
      throw errorGenerator({
        msg: responseMessage.BAD_REQUEST,
        statusCode: statusCode.BAD_REQUEST,
      });
    }
    const userGetNft = await prisma.user_has_nfts.create({
      data: {
        userId: findUserIdAndNftId!.userId,
        nftId: findUserIdAndNftId!.nftId,
      },
    });
    await prisma.admin.delete({
      where: {
        id,
      },
    });
    return userGetNft;
  } catch (error) {
    throw error;
  }
};

const rejectNft = async (id: number) => {
  try {
    const findUserIdAndNftId = await prisma.admin.findFirst({
      where: {
        id,
      },
      select: {
        userId: true,
        nftId: true,
      },
    });
    if (!findUserIdAndNftId) {
      throw errorGenerator({
        msg: responseMessage.BAD_REQUEST,
        statusCode: statusCode.BAD_REQUEST,
      });
    }
    await prisma.admin.delete({
      where: {
        id,
      },
    });
  } catch (error) {
    throw error;
  }
};
export default { getRequestUser, approveNft, rejectNft };
