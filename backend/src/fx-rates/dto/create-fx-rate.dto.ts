import { IsDateString, IsIn, Matches, Validate } from 'class-validator';
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  CURRENCIES,
  type Currency,
} from '../../common/dictionaries/currencies';

@ValidatorConstraint({ name: 'DifferentCurrency', async: false })
class DifferentCurrencyConstraint implements ValidatorConstraintInterface {
  validate(quote: string, args: ValidationArguments): boolean {
    const object = args.object as { base?: string };
    return quote !== object.base;
  }

  defaultMessage(): string {
    return 'quote must differ from base';
  }
}

export class CreateFxRateDto {
  @IsIn(CURRENCIES)
  base: Currency;

  @IsIn(CURRENCIES)
  @Validate(DifferentCurrencyConstraint)
  quote: Currency;

  @IsDateString()
  date: string;

  @Matches(/^\d+(\.\d+)?$/, {
    message: 'rate must be a positive decimal string',
  })
  rate: string;
}
