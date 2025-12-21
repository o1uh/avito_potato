import { Modal, Form, Select, Checkbox, List, Typography, message } from 'antd';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { dealApi } from '@/entities/deal/api/deal.api';
import { companyApi } from '@/entities/user/api/company.api';
import { CommercialOffer } from '@/entities/deal/model/types';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/config/routes';
import { formatCurrency } from '@/shared/lib/currency';

interface Props {
  offer: CommercialOffer;
  open: boolean;
  onCancel: () => void;
}

export const AcceptDealModal = ({ offer, open, onCancel }: Props) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: company } = useQuery({
    queryKey: ['myCompany'],
    queryFn: companyApi.getMyCompany,
    enabled: open,
  });

  const addressOptions = company?.addresses
    ?.map(a => ({
      label: `${a.addressType.name}: ${a.address.city}, ${a.address.street}`,
      value: a.address.id
    })) || [];

  const createDealMutation = useMutation({
    mutationFn: (values: any) => dealApi.createFromOffer(offer.id, values.closeRequest),
    onSuccess: (deal, variables) => {
      message.success('Сделка создана!');
      
      // Используем variables для доступа к данным формы (addressId)
      dealApi.accept(deal.id, variables.addressId)
        .then(() => {
            navigate(ROUTES.DEAL_DETAILS(deal.id));
            queryClient.invalidateQueries({ queryKey: ['deals-list'] });
        })
        .catch(() => {
            message.warning('Сделка создана, но не удалось установить адрес. Перейдите в сделку.');
            navigate(ROUTES.DEAL_DETAILS(deal.id));
        });
    },
    onError: () => message.error('Ошибка создания сделки')
  });

  const requestQty = offer.purchaseRequest?.requestedQuantity || 0;
  const offerQty = offer.items.reduce((acc, item) => acc + item.quantity, 0);
  const defaultCloseRequest = offerQty >= requestQty;

  return (
    <Modal
      title="Принятие условий сделки"
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={createDealMutation.isPending}
      okText="Подтвердить и создать сделку"
    >
      <div className="mb-4 bg-gray-50 p-3 rounded">
        <Typography.Text type="secondary" className="block mb-2">Состав заказа:</Typography.Text>
        <List
          size="small"
          dataSource={offer.items}
          renderItem={item => (
            <List.Item className="!px-0">
              <div className="flex justify-between w-full">
                <span>{item.productVariant?.product?.name} ({item.productVariant?.variantName})</span>
                <span>{item.quantity} шт x {formatCurrency(item.pricePerUnit)}</span>
              </div>
            </List.Item>
          )}
        />
        <div className="flex justify-between mt-2 font-bold border-t pt-2">
            <span>Итого:</span>
            <span>{formatCurrency(offer.offerPrice)}</span>
        </div>
      </div>

      <Form 
        form={form} 
        layout="vertical" 
        onFinish={(v) => createDealMutation.mutate(v)}
        initialValues={{ closeRequest: defaultCloseRequest }}
      >
        <Form.Item
          name="addressId"
          label="Адрес доставки / получения"
          rules={[{ required: true, message: 'Выберите адрес' }]}
          help={addressOptions.length === 0 ? "У вас нет подходящих адресов. Добавьте их в настройках." : ""}
        >
          <Select placeholder="Выберите адрес" options={addressOptions} />
        </Form.Item>

        <Form.Item name="closeRequest" valuePropName="checked">
          <Checkbox>
            Закрыть заявку на закупку (RFQ)? 
            <span className="text-gray-400 block text-xs font-normal ml-6">
                Другие поставщики больше не смогут присылать предложения.
            </span>
          </Checkbox>
        </Form.Item>
      </Form>
    </Modal>
  );
};