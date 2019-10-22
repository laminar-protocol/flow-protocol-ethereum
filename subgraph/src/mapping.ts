import { BigDecimal, BigInt, EthereumEvent } from '@graphprotocol/graph-ts';
import {
  NewFlowToken, Minted, Redeemed, Liquidated, CollateralAdded, CollateralWithdrew, FlowTokenWithdrew, FlowTokenDeposited,
} from '../generated/FlowProtocol/FlowProtocol';
import { FlowToken } from '../generated/FlowProtocol/FlowToken';
import { NewTradingPair } from '../generated/FlowMarginProtocol/FlowMarginProtocol';
import { PriceUpdated } from '../generated/PriceOracle/PriceOracleInterface';
import { MarginTradingPair, OpenPosition, ClosePosition } from '../generated/templates/MarginTradingPair/MarginTradingPair';
import { TokenEntity, PriceEntity, EventEntity, FlowProtocolEntity, TradingPairEntity, MarginPositionEntity } from '../generated/schema';

let one = BigDecimal.fromString('1000000000000000000');

function getFlowProtocol(): FlowProtocolEntity {
  let flow = FlowProtocolEntity.load('0');
  if (flow == null) {
    flow = new FlowProtocolEntity('0');
    flow.totalEvents = BigInt.fromI32(0);
  }
  return flow as FlowProtocolEntity;
}

function createNewEventEntity(flow: FlowProtocolEntity, event: EthereumEvent): EventEntity {
  flow.totalEvents = flow.totalEvents.plus(BigInt.fromI32(1));
  let evt = new EventEntity(flow.totalEvents.toHex());
  evt.timestamp = event.block.timestamp.toI32();
  evt.txhash = event.block.hash;
  evt.block = event.block.number.toI32();
  return evt;
}

export function handleNewFlowToken(event: NewFlowToken): void {
  let token = new TokenEntity(event.params.token.toHex());
  let flowToken = FlowToken.bind(event.params.token);
  token.name = flowToken.name();
  token.symbol = flowToken.symbol();
  token.save();
}

export function handleMinted(event: Minted): void {
  let flow = getFlowProtocol();
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
  let flow = getFlowProtocol();
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
  let flow = getFlowProtocol();
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
  let flow = getFlowProtocol();
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
  let flow = getFlowProtocol();
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
  let flow = getFlowProtocol();
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
  let flow = getFlowProtocol();
  let tx = createNewEventEntity(flow, event);

  tx.kind = 'Withdrew';
  tx.user = event.params.sender;
  tx.token = event.params.token.toHex();
  tx.baseTokenAmount = event.params.baseTokenAmount.toBigDecimal().div(one);
  tx.flowTokenAmount = event.params.flowTokenAmount.toBigDecimal().div(one);

  tx.save();
  flow.save();
}

export function handlePriceUpdated(event: PriceUpdated): void {
  let price = new PriceEntity(event.params.addr.toHex());
  price.value = event.params.price.divDecimal(one);
  price.updatedAt = event.block.timestamp.toI32();
  price.save();
}

export function handleNewTradingPiar(event: NewTradingPair): void {
  let entity = new TradingPairEntity(event.params.pair.toHex());
  let pair = MarginTradingPair.bind(event.params.pair);
  entity.quoteToken = pair.quoteToken().toHex();
  entity.leverage = pair.leverage().toI32();
  entity.safeMarginPercent = pair.safeMarginPercent().toBigDecimal().div(one);
  entity.liquidationFee = pair.liquidationFee().toBigDecimal().div(one);
  entity.save();
}

export function handleOpenPosition(event: OpenPosition): void {
  let entity = new MarginPositionEntity(event.address.toHex() + event.params.positionId.toString());
  let pair = MarginTradingPair.bind(event.address);
  entity.pair = event.address.toHex();
  entity.positionId = event.params.positionId.toI32();
  entity.owner = event.params.sender;
  entity.liquidityPool = event.params.liquidityPool;
  entity.amount = event.params.baseTokenAmount.toBigDecimal().div(one);
  entity.openPrice = event.params.openPrice.toBigDecimal().div(one);
  entity.bidSpread = event.params.bidSpread.toBigDecimal().div(one);
  entity.liquidationFee = pair.liquidationFee().toBigDecimal().div(one);
  entity.save();
}

export function handleClosePosition(event: ClosePosition): void {
  let entity = new MarginPositionEntity(event.address.toHex() + event.params.positionId.toString());
  entity.closePrice = event.params.closePrice.toBigDecimal().div(one);
  entity.liquidator = event.params.liquidator;
  entity.closeOwnerAmount = event.params.ownerAmount.toBigDecimal().div(one);
  entity.closeLiquidityPoolAmount = event.params.liquidityPoolAmount.toBigDecimal().div(one);
  entity.save();
}
