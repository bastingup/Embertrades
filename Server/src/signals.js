export const signalType = {"BUY": "BUY"
                   ,"SELL": "SELL"}

export class Signal {
  constructor(signalType, asset) {
    this.signalType = signalType;
    this.asset = asset;
  }
}