export interface userCreateDto {
  nickname: string;
  snsId: string;
  profileImage: string;
  email: string;
  phone: string;
  social: string;
  isMarketing: boolean;
}

export interface createNftDto {
  ownerId: number;
  nftName: string;
  image: string;
  description: string;
  authType: number;
  options: string;
}

export interface userInfo {
  userId: number;
  nftId: number;
  email: string;
}
