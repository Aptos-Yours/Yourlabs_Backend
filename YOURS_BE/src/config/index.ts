import dotenv from 'dotenv';

const envFound = dotenv.config();

if (envFound.error) {
  throw new Error("⚠️  Couldn't find .env file  ⚠️");
}

export default {
  /**
   * env
   */
  env: process.env.NODE_ENV as string,
  /**
   * PORT
   */
  port: parseInt(process.env.PORT as string, 10) as number,

  /**
   * JWT
   */
  jwtSecret: process.env.JWT_SECRET as string,
  jwtAlgo: process.env.JWT_ALGORITHM as string,

  /**
   * KAKAO
   */
  kakaoRestApiKey: process.env.KAKAO_REST_API_KEY as string,
  kakaoRedirectUri: process.env.KAKAO_REDIRECT_URI as string,

  /**
   * REDIS
   */
  redisHost: process.env.REDIS_HOST as string,
  redisPort: parseInt(process.env.REDIS_PORT as string, 10) as number,
  redisUserName: process.env.REDIS_USERNAME as string,
  redisPassword: process.env.REDIS_PASSWORD as string,

  /**
   * NAVER_CLOUD
   */
  naverCloudServiceId: process.env.NAVER_CLOUD_SERVICE_ID as string,
  naverCloudSmsAccessKey: process.env.NAVER_CLOUD_ACCESS_KEY as string,
  naverCloudSmsSecretKey: process.env.NAVER_CLOUD_SECRET_KEY as string,

  /**
   * CALL_NUMBER
   */
  callNumber: process.env.CALL_NUMBER as string,

  /**
   * SLACK_WEBHOOK
   */
  webhookURL: process.env.SLACK_WEBHOOK_URL as string,
  /**
   * EC2 URL
   */
  ec2URL: process.env.EC2_URL as string,

  /**
   * S3 bucket
   */
  s3AccessKey: process.env.S3_ACCESS_KEY as string,
  s3SecretKey: process.env.S3_SECRET_KEY as string,
  bucketName: process.env.S3_BUCKET as string,

  /**
   * AuthMail
   */
  authMailUser: process.env.MAIL_USER as string,
  authMailPassWord: process.env.MAIL_PASSWORD as string,

  /**
   * Web3
   */
  aptosRPC: process.env.APTOS_RPC as string,
  walletSecretKey: process.env.WALLET_SECRET as string,
  ipfsId: process.env.REACT_APP_IPFS_ID as string,
  ipfsSecret: process.env.REACT_APP_IPFS_SECRET as string,
};
