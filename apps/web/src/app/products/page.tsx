import { AppShell } from "../../components/layout/AppShell";
import { ProductList } from "../../components/products/ProductList";

export const metadata = {
  title: "Products & SKUs | BTS ERP",
  description: "Product master catalog, pricing, categories, and unit management.",
};

export default function ProductsPage() {
  return (
    <AppShell>
      <ProductList />
    </AppShell>
  );
}
