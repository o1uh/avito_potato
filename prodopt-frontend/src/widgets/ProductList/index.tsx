import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Pagination, Empty, Button, Skeleton } from 'antd';
import { productApi } from '@/entities/product/api/product.api';
import { ProductCard } from '@/entities/product/ui/ProductCard';
import { ReloadOutlined } from '@ant-design/icons';

const PAGE_SIZE = 12;

export const ProductList = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Парсинг параметров из URL
  const q = searchParams.get('q') || undefined;
  const categoryId = searchParams.get('categoryId') ? Number(searchParams.get('categoryId')) : undefined;
  const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
  const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
  
  // Пагинация
  const offsetParam = searchParams.get('offset');
  const currentOffset = offsetParam ? Number(offsetParam) : 0;
  const currentPage = Math.floor(currentOffset / PAGE_SIZE) + 1;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['products', { q, categoryId, minPrice, maxPrice, currentOffset }],
    queryFn: () => productApi.search({
      q,
      categoryId,
      minPrice,
      maxPrice,
      limit: PAGE_SIZE,
      offset: currentOffset
    }),
    // Keep previous data while fetching new to prevent flickering
    placeholderData: (previousData) => previousData, 
  });

  const handlePageChange = (page: number) => {
    const newOffset = (page - 1) * PAGE_SIZE;
    searchParams.set('offset', String(newOffset));
    setSearchParams(searchParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Состояния ---

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border border-red-100">
        <p className="text-red-500 mb-4">Не удалось загрузить товары</p>
        <Button onClick={() => refetch()} icon={<ReloadOutlined />}>Попробовать снова</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className="p-4 border rounded-lg bg-white">
            <Skeleton.Image active className="!w-full !h-[200px] mb-4" />
            <Skeleton active paragraph={{ rows: 2 }} />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="py-20 bg-white rounded-lg">
        <Empty description="Товары не найдены" />
      </div>
    );
  }

  // --- Рендер списка ---

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {data.items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <div className="flex justify-center">
        <Pagination
          current={currentPage}
          pageSize={PAGE_SIZE}
          total={data.total}
          onChange={handlePageChange}
          showSizeChanger={false}
        />
      </div>
    </div>
  );
};