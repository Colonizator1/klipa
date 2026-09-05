import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { COUNTRIES } from '../common/dictionaries/countries';
import { CURRENCIES } from '../common/dictionaries/currencies';
import { CustodyPlacesService } from '../custody-places/custody-places.service';

@Controller('dictionaries')
@UseGuards(JwtAuthGuard)
export class DictionariesController {
  constructor(private readonly custodyPlaces: CustodyPlacesService) {}

  @Get('currencies')
  getCurrencies() {
    return CURRENCIES;
  }

  @Get('countries')
  getCountries() {
    return COUNTRIES;
  }

  @Get('custody-places')
  async getCustodyPlaces(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query('country') country?: string,
    @Query('q') q?: string,
  ) {
    const places = await this.custodyPlaces.search(currentUser.id, country, q);
    return places.map((place) => ({
      country: place.country,
      holder: place.holder,
    }));
  }
}
