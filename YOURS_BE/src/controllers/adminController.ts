import { Request, Response, NextFunction } from 'express';
import { responseMessage, statusCode } from '../modules/constants';
import { fail, success } from '../modules/constants/util';
import { nftService, adminService } from '../services';
import { mintAptosNFT } from '../contract/aptosContract';

const getRequestUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.body.id;
    const { nftId } = req.params;

    const data = await adminService.getRequestUser(userId, +nftId);

    return res
      .status(statusCode.OK)
      .send(
        success(statusCode.OK, responseMessage.READ_AUTH_PEOPLE_SUCCESS, data),
      );
  } catch (error) {
    next(error);
  }
};

const approveOrRejectNft = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { tableId, type } = req.body;
  try {
    switch (type) {
      case true: {
        const data = await adminService.approveNft(+tableId);
        const approveInfo = await adminService.approveNft(+tableId);
        const getNftInfo = await nftService.getNftInfo(+approveInfo.nftId);
        const messageInfo = await nftService.getUserAndNftInfo(
          approveInfo.userId,
          +getNftInfo.id,
          'NFT_APPLY_APPROVE',
        );
        const mint = await mintAptosNFT(
          messageInfo.nftName!,
          messageInfo.name!,
        );
        await nftService.saveMintId(
          +approveInfo.userId,
          +approveInfo.nftId,
          +mint!.mintId,
        );
        return res
          .status(statusCode.OK)
          .send(
            success(statusCode.OK, responseMessage.APPROVE_NFT_SUCCESS, data),
          );
      }
      case false: {
        await adminService.rejectNft(+tableId);
        return res
          .status(statusCode.OK)
          .send(success(statusCode.OK, responseMessage.APPROVE_NFT_FAIL));
      }
      default:
        return res
          .status(statusCode.NOT_FOUND)
          .send(fail(statusCode.NOT_FOUND, responseMessage.NOT_FOUND));
    }
  } catch (error) {
    next(error);
  }
};

const getAdminNftRewardList = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { nftId } = req.params;
  try {
    const data = await adminService.getAdminNftRewardList(+nftId);
    return res
      .status(statusCode.OK)
      .send(
        success(
          statusCode.OK,
          responseMessage.READ_NFT_ADMIN_REWARD_INFO_SUCCESS,
          data,
        ),
      );
  } catch (error) {
    next(error);
  }
};

const getAdminNftRewardDetail = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { rewardId } = req.params;
  try {
    const data = await adminService.getAdminNftRewardDetail(+rewardId);
    return res
      .status(statusCode.OK)
      .send(
        success(
          statusCode.OK,
          responseMessage.READ_NFT_ADMIN_REWARD_DETAIL_INFO_SUCCESS,
          data,
        ),
      );
  } catch (error) {
    next(error);
  }
};
export default {
  getRequestUser,
  approveOrRejectNft,
  getAdminNftRewardList,
  getAdminNftRewardDetail,
};
