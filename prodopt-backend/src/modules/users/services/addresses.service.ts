import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  // Создание юридического адреса при регистрации компании
  async createLegalAddress(companyId: number, addressData: any) {
    // Получаем ID типа "Юридический"
    const type = await this.prisma.addressType.findFirst({ where: { name: 'Юридический' } });
    const typeId = type ? type.id : 1;

    // Создаем запись адреса
    const address = await this.prisma.address.create({
      data: {
        postalCode: addressData.postal_code,
        country: addressData.country || 'Россия',
        region: addressData.region_with_type,
        city: addressData.city,
        street: addressData.street_with_type,
        house: addressData.house,
        building: addressData.block,
        apartment: addressData.flat,
        comment: 'Автоматически создан при регистрации',
      },
    });

    // Связываем с компанией
    await this.prisma.companyAddress.create({
      data: {
        companyId,
        addressId: address.id,
        addressTypeId: typeId,
      },
    });

    return address;
  }
  
  // Метод для получения отформатированного адреса для документов
  async getLegalAddressString(companyId: number): Promise<string> {
    const link = await this.prisma.companyAddress.findFirst({
        where: { 
            companyId, 
            addressType: { name: 'Юридический' } 
        },
        include: { address: true }
    });

    if (!link || !link.address) return 'Адрес не указан';

    const a = link.address;
    // Собираем строку: "123456, г. Москва, ул. Ленина, д. 1"
    const parts = [
        a.postalCode, 
        a.country,
        a.region, 
        a.city, 
        a.street, 
        a.house ? `д. ${a.house}` : null, 
        a.building ? `корп. ${a.building}` : null, 
        a.apartment ? `кв./оф. ${a.apartment}` : null
    ];
    return parts.filter(p => p).join(', ');
  }
}