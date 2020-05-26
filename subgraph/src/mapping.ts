import { Address, BigDecimal, BigInt, ethereum } from '@graphprotocol/graph-ts';
import {
  NewFlowToken,
  Minted,
  Redeemed,
  Liquidated,
  CollateralAdded,
  CollateralWithdrew,
  FlowTokenWithdrew,
  FlowTokenDeposited,
} from '../generated/SyntheticFlowProtocol/SyntheticFlowProtocol';
import { SyntheticFlowToken } from '../generated/SyntheticFlowProtocol/SyntheticFlowToken';
import {
  NewTradingPair,
  PositionOpened,
  PositionClosed,
} from '../generated/MarginFlowProtocol/MarginFlowProtocol';
import { MoneyMarket } from '../generated/MarginFlowProtocol/MoneyMarket';
import {
  PriceFeeded,
  PriceOracleInterface,
} from '../generated/PriceOracle/PriceOracleInterface';
import {
  MarginTokenPairEntity,
  SyntheticTokenEntity,
  PriceEntity,
  EventEntity,
  MarginPositionEntity,
  SyntheticFlowProtocolEntity,
} from '../generated/schema';
import * as deployment from '../generated/deployment';

let one = BigDecimal.fromString('1000000000000000000');

function getSyntheticFlowProtocol(): SyntheticFlowProtocolEntity {
  let flow = SyntheticFlowProtocolEntity.load('0');
  if (flow == null) {
    flow = new SyntheticFlowProtocolEntity('0');
    flow.totalEvents = BigInt.fromI32(0);
  }
  return flow as SyntheticFlowProtocolEntity;
}

function createNewEventEntity(
  flow: SyntheticFlowProtocolEntity,
  event: ethereum.Event,
): EventEntity {
  flow.totalEvents = flow.totalEvents.plus(BigInt.fromI32(1));
  let evt = new EventEntity(flow.totalEvents.toHex());
  evt.timestamp = event.block.timestamp.toI32();
  evt.txhash = event.transaction.hash;
  evt.block = event.block.number.toI32();
  return evt;
}

export function handleNewFlowToken(event: NewFlowToken): void {
  let token = new SyntheticTokenEntity(event.params.token.toHex());
  let flowToken = SyntheticFlowToken.bind(event.params.token);
  token.name = flowToken.name();
  token.symbol = flowToken.symbol();
  token.save();
}

export function handleMinted(event: Minted): void {
  let flow = getSyntheticFlowProtocol();
  let tx = createNewEventEntity(flow, event);

  tx.kind = 'Minted';
  tx.user = event.params.sender;
  tx.token = event.params.token.toHex();
  tx.liquidityPool = event.params.liquidityPool;
  tx.baseTokenAmount = event.params.baseTokenAmount.toBigDecimal().div(one);
  tx.flowTokenAmount = event.params.flowTokenAmount.toBigDecimal().div(one);

  tx.save();
  flow.save();
}

export function handleRedeemed(event: Redeemed): void {
  let flow = getSyntheticFlowProtocol();
  let tx = createNewEventEntity(flow, event);

  tx.kind = 'Redeemed';
  tx.user = event.params.sender;
  tx.token = event.params.token.toHex();
  tx.liquidityPool = event.params.liquidityPool;
  tx.baseTokenAmount = event.params.baseTokenAmount.toBigDecimal().div(one);
  tx.flowTokenAmount = event.params.flowTokenAmount.toBigDecimal().div(one);

  tx.save();
  flow.save();
}

export function handleLiquidated(event: Liquidated): void {
  let flow = getSyntheticFlowProtocol();
  let tx = createNewEventEntity(flow, event);

  tx.kind = 'Liquidated';
  tx.user = event.params.sender;
  tx.token = event.params.token.toHex();
  tx.liquidityPool = event.params.liquidityPool;
  tx.baseTokenAmount = event.params.baseTokenAmount.toBigDecimal().div(one);
  tx.flowTokenAmount = event.params.flowTokenAmount.toBigDecimal().div(one);

  tx.save();
  flow.save();
}

export function handleCollateralAdded(event: CollateralAdded): void {
  let flow = getSyntheticFlowProtocol();
  let tx = createNewEventEntity(flow, event);

  tx.kind = 'CollateralAdded';
  tx.user = event.params.liquidityPool;
  tx.token = event.params.token.toHex();
  tx.liquidityPool = event.params.liquidityPool;
  tx.baseTokenAmount = event.params.baseTokenAmount.toBigDecimal().div(one);
  tx.flowTokenAmount = event.params.iTokenAmount.toBigDecimal().div(one);

  tx.save();
  flow.save();
}

export function handleCollateralWithdrew(event: CollateralWithdrew): void {
  let flow = getSyntheticFlowProtocol();
  let tx = createNewEventEntity(flow, event);

  tx.kind = 'CollateralWithdrew';
  tx.user = event.params.liquidityPool;
  tx.token = event.params.token.toHex();
  tx.liquidityPool = event.params.liquidityPool;
  tx.baseTokenAmount = event.params.baseTokenAmount.toBigDecimal().div(one);
  tx.flowTokenAmount = event.params.iTokenAmount.toBigDecimal().div(one);

  tx.save();
  flow.save();
}

export function handleFlowTokenDeposited(event: FlowTokenDeposited): void {
  let flow = getSyntheticFlowProtocol();
  let tx = createNewEventEntity(flow, event);

  tx.kind = 'Deposited';
  tx.user = event.params.sender;
  tx.token = event.params.token.toHex();
  tx.baseTokenAmount = event.params.baseTokenAmount.toBigDecimal().div(one);
  tx.flowTokenAmount = event.params.flowTokenAmount.toBigDecimal().div(one);

  tx.save();
  flow.save();
}

export function handleFlowTokenWithdrew(event: FlowTokenWithdrew): void {
  let flow = getSyntheticFlowProtocol();
  let tx = createNewEventEntity(flow, event);

  tx.kind = 'Withdrew';
  tx.user = event.params.sender;
  tx.token = event.params.token.toHex();
  tx.baseTokenAmount = event.params.baseTokenAmount.toBigDecimal().div(one);
  tx.flowTokenAmount = event.params.flowTokenAmount.toBigDecimal().div(one);

  tx.save();
  flow.save();
}

export function handlePriceFeeded(event: PriceFeeded): void {
  let price = new PriceEntity(event.params.addr.toHex());
  let oracle = PriceOracleInterface.bind(event.address);
  let value = oracle.readPrice(event.params.addr).divDecimal(one);
  price.value = value;
  price.updatedAt = event.block.timestamp.toI32();
  price.save();
}

export function handleNewTradingPair(event: NewTradingPair): void {
  let entity = new MarginTokenPairEntity(
    event.params.base.toHex() + event.params.quote.toHex(),
  );

  entity.base = event.params.base;
  entity.quote = event.params.quote;

  entity.save();
}

export function handleOpenPosition(event: PositionOpened): void {
  let entity = new MarginPositionEntity(
    event.address.toHex() + event.params.positionId.toString(),
  );
  entity.base = event.params.baseToken;
  entity.quote = event.params.quoteToken;
  entity.positionId = event.params.positionId.toI32();
  entity.owner = event.params.sender;
  entity.liquidityPool = event.params.liquidityPool;
  entity.amount = event.params.leveragedDebitsInUsd.toBigDecimal().div(one);
  entity.leverage = event.params.leverage.toI32();
  entity.openPrice = event.params.price.toBigDecimal().div(one);
  entity.openTime = event.block.timestamp.toI32();
  entity.openTxhash = event.transaction.hash;
  entity.openBlock = event.block.number.toI32();
  entity.save();
}

export function handleClosePosition(event: PositionClosed): void {
  let entity = new MarginPositionEntity(
    event.address.toHex() + event.params.positionId.toString(),
  );
  let moneyMarket = MoneyMarket.bind(
    Address.fromString(deployment.moneyMarket),
  );
  let iTokenRate = moneyMarket
    .exchangeRate()
    .toBigDecimal()
    .div(one);
  entity.closePrice = event.params.price.toBigDecimal().div(one);
  entity.liquidator = event.params.sender;
  entity.realizedPl = event.params.realizedPl
    .toBigDecimal()
    .div(one)
    .times(iTokenRate);
  entity.closeTime = event.block.timestamp.toI32();
  entity.closeTxhash = event.transaction.hash;
  entity.closeBlock = event.block.number.toI32();
  entity.save();
}
