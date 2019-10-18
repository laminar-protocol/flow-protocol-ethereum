import { NewFlowToken } from '../generated/FlowProtocol/FlowProtocol';
import { FlowToken } from '../generated/FlowProtocol/FlowToken';
import { PriceUpdated } from '../generated/PriceOracle/PriceOracleInterface';
import { Token, Price } from '../generated/schema';
import { BigDecimal } from '@graphprotocol/graph-ts';

let one = BigDecimal.fromString('1000000000000000000');

export function handleNewFlowToken(event: NewFlowToken): void {
  let token = new Token(event.params.token.toHex());
  let flowToken = FlowToken.bind(event.params.token);
  token.name = flowToken.name();
  token.symbol = flowToken.symbol();
  token.save();
}

export function handlePriceUpdated(event: PriceUpdated): void {
  let price = new Price(event.params.addr.toHex());
  price.value = event.params.price.divDecimal(one);
  price.updatedAt = event.block.timestamp.toI32();
  price.save();
}
