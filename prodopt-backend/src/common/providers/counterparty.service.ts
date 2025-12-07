import { Injectable } from '@nestjs/common';

@Injectable()
export class CounterpartyService {
  async checkByInn(inn: string) {
    // TODO: Implement in Stage 5
    return { inn };
  }
}