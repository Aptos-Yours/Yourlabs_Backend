import {
  AptosClient,
  AptosAccount,
  TokenClient,
  HexString,
  getPropertyValueRaw,
  FaucetClient,
} from 'aptos';
import 'dotenv/config';
import config from '../config';

import {
  getTransactionDate,
  mutateProperties,
  getTokenDataWithPropertyVersion,
  getRandomNumber,
  getUpgrageResult,
  upgradeEquipment,
  burnIngredient,
  createCollection,
} from './aptosModule';

const client = new AptosClient('https://fullnode.devnet.aptoslabs.com');
const tokenClient = new TokenClient(client);
const faucetClient = new FaucetClient(
  'https://fullnode.devnet.aptoslabs.com',
  'https://faucet.devnet.aptoslabs.com',
);
const yoursAccount = new AptosAccount(
);
const collectionName ='testCollection';
const key = ['benefitUri', 'indexList', 'owner', 'maxPropertyVersion'];
const type = ['string', 'string', 'string', 'string'];
const deployAptosNFT = async (
  nftName: string,
  uri: string,
  benefitUri: string,
) => {
  try {
    const value = [benefitUri, '[]', 'defaultOwner', '1'];
    const propertyValue = getPropertyValueRaw(value, type);
    const deployTokenHash = await tokenClient.createTokenWithMutabilityConfig(
      yoursAccount,
      collectionName,
      nftName,
      'description',
      100,
      uri,
      undefined,
      undefined,
      undefined,
      undefined,
      key,
      propertyValue,
      type,
      [true, true, true, true, true],
    );
    await client.waitForTransaction(deployTokenHash, { checkSuccess: true });
    await mutateProperties(
      yoursAccount,
      collectionName,
      nftName,
      0,
      ['owner'],
      ['version1'],
      ['string'],
    );

    const date = await getTransactionDate(deployTokenHash);
    const data = {
      date: new Date(date),
      address: yoursAccount.address(),
    };
    return data;
  } catch (error) {
    throw error;
  }
};

const mintAptosNFT = async (nftName: string, receiverName: string) => {
  try {
    const mintTxHash = await mutateProperties(
      yoursAccount,
      collectionName,
      nftName,
      0,
      ['owner'],
      [receiverName],
      ['string'],
    );
    const version1Data = await getTokenDataWithPropertyVersion(
      nftName,
      '1',
      yoursAccount,
      collectionName,
    );
    const maxPropertyVersion = parseInt(
      version1Data.token_properties.data.maxPropertyVersion.value.toString(),
    );
    const ownedToken = await getTokenDataWithPropertyVersion(
      nftName,
      `${maxPropertyVersion + 1}`,
      yoursAccount,
      collectionName,
    );
    if (
      ownedToken.token_properties.data.owner.value.toString() === receiverName
    ) {
      await mutateProperties(
        yoursAccount,
        collectionName,
        nftName,
        1,
        ['maxPropertyVersion'],
        [`${maxPropertyVersion + 1}`],
        ['string'],
      );
      const mintDate = await getTransactionDate(mintTxHash);
      const data = {
        mintId: maxPropertyVersion + 1,
        mintTxHash: mintTxHash,
        date: mintDate,
      };
      return data;
    }
  } catch (error) {
    throw error;
  }
};

const setAptosBenefitURI = async (nftName: string, uri: string) => {
  await mutateProperties(
    yoursAccount,
    collectionName,
    nftName,
    1,
    ['benefitUri'],
    [`${uri}`],
    ['string'],
  );
};

const transferAptosNFT = async (
  sender: AptosAccount,
  receiverAddress: string,
  nftName: string,
) => {
  const receiverAccount = new AptosAccount(undefined, receiverAddress);
  const transferToken = await tokenClient.offerToken(
    sender,
    receiverAccount.address(),
    sender.address(),
    collectionName,
    nftName,
    1,
    0,
  );
  await client.waitForTransaction(transferToken, { checkSuccess: true });
};



const upgradeNFT = async (
  owner: AptosAccount,
  equipmentName: string,
  ingredientName: string,
  upgradeImageLink: string,
  successPercentage: number,
) => {
  const percentage = getRandomNumber(1, 100);
  const isSuccess = getUpgrageResult(successPercentage, percentage);
  if (isSuccess) {
    await upgradeEquipment(
      owner,
      equipmentName,
      ingredientName,
      upgradeImageLink,
    );
  }
  await burnIngredient(owner, ingredientName);
  return isSuccess;
};

const testUpgradeNFT = async () => {
  console.log('test Upgrade NFT Started');
  const testAccount = new AptosAccount();
  const collection = 'testUpgrade';
  const equipmentTokenName = 'equipment';
  const ingredientTokenName = 'ingredient';
  const equipmentKeys = ['itemName', 'level', 'imageLink'];
  const equipmentValues = ['SWORD', '0', 'level1LINK'];
  const type = ['string', 'string', 'string'];
  await faucetClient.fundAccount(testAccount.address(), 100_000_000);
  await createCollection(testAccount, collection);

  const makeEquipment = await tokenClient.createTokenWithMutabilityConfig(
    testAccount,
    collection,
    equipmentTokenName,
    'this is equipment',
    1,
    'testUri',
    undefined,
    undefined,
    undefined,
    undefined,
    equipmentKeys,
    getPropertyValueRaw(equipmentValues, type),
    type,
    [true, true, true, true, true],
  );
  await client.waitForTransaction(makeEquipment, { checkSuccess: true });
  console.log('equipment generation Done');
  await mutateProperties(
    testAccount,
    collection,
    equipmentTokenName,
    0,
    ['level'],
    ['1'],
    ['string'],
  );

  const makeIngredient = await tokenClient.createToken(
    testAccount,
    collection,
    ingredientTokenName,
    'this is ingredient',
    1,
    'testUri',
  );
  await client.waitForTransaction(makeIngredient, { checkSuccess: true });

  console.log('=========Equipment Token Info Before Upgrade===========');
  const equipmentTokenData = await getTokenDataWithPropertyVersion(
    equipmentTokenName,
    '1',
    testAccount,
    collection,
  );
  console.log(JSON.stringify(equipmentTokenData, null, 4));

  const successPercentage = 30;
  console.log('=========Equipment Upgrade Just Started!===========');
  console.log(`success percentage : ${successPercentage}%`);

  const isSuccess = await upgradeNFT(
    testAccount,
    equipmentTokenName,
    ingredientTokenName,
    'newUrl',
    successPercentage,
  );
  console.log(
    `Upgrade Result is ${isSuccess} (True : success, False: Failure)`,
  );

  console.log('=========Equipment Upgrade Done!===================');

  const upgradeEquipmentTokenData = await getTokenDataWithPropertyVersion(
    equipmentTokenName,
    '1',
    testAccount,
    collection,
  );
  console.log(JSON.stringify(upgradeEquipmentTokenData, null, 4));
};

testUpgradeNFT();
export {
  upgradeNFT,
};
