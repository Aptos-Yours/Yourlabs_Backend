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
