import { Tag } from 'antd';
import { DealStatus } from '@/shared/config/enums';

interface Props {
  status: number;
}

export const DealStatusBadge = ({ status }: Props) => {
  let color = 'default';
  let text = 'Неизвестно';

  switch (status) {
    case DealStatus.CREATED:
      color = 'blue';
      text = 'Создана / Согласование';
      break;
    case DealStatus.AGREED:
      color = 'cyan';
      text = 'Согласована / Ожидает оплаты';
      break;
    case DealStatus.PAID:
      color = 'green';
      text = 'Оплачена / В обработке';
      break;
    case DealStatus.SHIPPED:
      color = 'geekblue';
      text = 'В пути';
      break;
    case DealStatus.COMPLETED:
      color = 'success';
      text = 'Завершена';
      break;
    case DealStatus.CANCELED:
      color = 'default';
      text = 'Отменена';
      break;
    case DealStatus.DISPUTE:
      color = 'red';
      text = 'Спор / Арбитраж';
      break;
  }

  return <Tag color={color} className="text-sm py-1 px-2">{text}</Tag>;
};