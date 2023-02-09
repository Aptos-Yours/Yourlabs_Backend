import { userCreateDto } from '../interfaces/user/DTO';
import auth from '../config/auth';
import { PrismaClient } from '@prisma/client';
import errorGenerator from '../middlewares/error/errorGenerator';
import { responseMessage, statusCode } from '../modules/constants';
const prisma = new PrismaClient();

export type SocialPlatform = 'kakao';

//* 소셜 유저 정보 가져오기
const getSocialUser = async (accesstoken: string) => {
  try {
    const user = await auth.kakaoAuth(accesstoken);
    if (!user) {
    }
    return user;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

//* 소셜 로그인 유저 조회
const findUserById = async (userId: string) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        snsId: userId,
      },
    });
    return user;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

//* 유저 회원가입
const signUpUser = async (
  userCreateDto: userCreateDto,
  refreshToken: string,
) => {
  try {
    const user = await prisma.user.create({
      data: {
        snsId: userCreateDto.snsId,
        name: userCreateDto.nickname,
        profileImage: userCreateDto.profileImage,
        email: userCreateDto.email,
        phone: userCreateDto.phone,
        social: userCreateDto.social,
        refreshToken: refreshToken,
        isMarketing: userCreateDto.isMarketing,
      },
    });
    return user;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

//* refreshToken 수정
const updateRefreshToken = async (id: number, refreshToken: string) => {
  try {
    await prisma.user.update({
      where: {
        id,
      },
      data: {
        refreshToken,
      },
    });
  } catch (error) {
    console.log(error);
    throw error;
  }
};

//* 유효한 refreshToken을 가지고 있는 유저 찾기
const findUserByRfToken = async (refreshToken: string) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        refreshToken,
      },
    });
    return user;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const getUserInfo = async (userId: number) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
      },
    });
    if (!user) {
      throw errorGenerator({
        msg: responseMessage.NOT_FOUND,
        statusCode: statusCode.NOT_FOUND,
      });
    }
    const data = {
      name: user.name,
      email: user.email,
      image: user.profileImage,
      phoneNumber: user.phone,
    };
    return data;
  } catch (error) {
    throw error;
  }
};

const updateProfilePhoto = async (userId: number, location: string) => {
  try {
    const data = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        profileImage: location,
      },
    });
    const result = {
      profileImage: data.profileImage,
    };
    return result;
  } catch (error) {
    throw error;
  }
};

const updateUserPhoneNumber = async (userId: number, phoneNumber: string) => {
  try {
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        phone: phoneNumber,
      },
    });
  } catch (error) {
    throw error;
  }
};

const updateUserEmail = async (userId: number, email: string) => {
  try {
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        email,
      },
    });
  } catch (error) {
    throw error;
  }
};

const updateNickName = async (userId: number, nickname: string) => {
  try {
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        name: nickname,
      },
    });
  } catch (error) {
    throw error;
  }
};
export default {
  getSocialUser,
  findUserById,
  signUpUser,
  updateRefreshToken,
  findUserByRfToken,
  getUserInfo,
  updateProfilePhoto,
  updateUserPhoneNumber,
  updateUserEmail,
  updateNickName,
};
