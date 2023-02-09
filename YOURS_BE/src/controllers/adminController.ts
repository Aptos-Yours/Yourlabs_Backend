import { Request, Response, NextFunction } from 'express';
import { responseMessage, statusCode } from '../modules/constants';
import { fail, success } from '../modules/constants/util';
import { adminService } from '../services';

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
export default {
  getRequestUser,
  approveOrRejectNft,
};
