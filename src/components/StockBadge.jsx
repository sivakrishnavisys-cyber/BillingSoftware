import { stockStatusLabel, getStockStatus } from '../services/productService';

export default function StockBadge({ product, status }) {
  const value = status || getStockStatus(product);
  return <span className={`badge badge-${value}`}>{stockStatusLabel(value)}</span>;
}
