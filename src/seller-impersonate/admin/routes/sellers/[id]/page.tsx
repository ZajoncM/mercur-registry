import { useState } from "react";
import { useLoaderData } from "react-router-dom";
import type { ComponentProps } from "react";
import type { LoaderFunctionArgs } from "react-router-dom";
import { Button, Container, Heading, toast } from "@medusajs/ui";
import { SellerDetailPage } from "@mercurjs/admin/pages";

declare const __BACKEND_URL__: string;
declare const __VENDOR_URL__: string;

type Seller = ComponentProps<
  typeof SellerDetailPage.MainGeneralSection
>["seller"];

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const res = await fetch(`${__BACKEND_URL__}/admin/sellers/${params.id}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Response("Seller not found", { status: 404 });
  const data = await res.json();
  return { seller: data.seller as Seller };
};

const ImpersonateSection = ({ sellerId }: { sellerId: string }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImpersonate = async () => {
    setLoading(true);
    setError(null);
    try {
      const impersonateRes = await fetch(
        `${__BACKEND_URL__}/admin/sellers/${sellerId}/impersonate`,
        { method: "POST", credentials: "include" },
      );
      if (!impersonateRes.ok) {
        const body = await impersonateRes.json().catch(() => ({}));
        throw new Error(body.message || "Impersonation failed");
      }
      const { token } = await impersonateRes.json();

      const sessionRes = await fetch(`${__BACKEND_URL__}/auth/session`, {
        method: "POST",
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!sessionRes.ok) {
        throw new Error("Failed to create vendor session");
      }

      window.open(__VENDOR_URL__ || "http://localhost:7001", "_blank");
      toast.success("Vendor session opened in new tab");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Impersonation failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Impersonation</Heading>
        <Button
          variant="secondary"
          size="small"
          onClick={handleImpersonate}
          isLoading={loading}
        >
          Login as seller
        </Button>
      </div>
      {error && (
        <div className="px-6 py-4">
          <p className="text-ui-fg-error text-sm">{error}</p>
        </div>
      )}
    </Container>
  );
};

const SellerDetailWithImpersonate = () => {
  const { seller } = useLoaderData() as { seller: Seller };

  return (
    <SellerDetailPage>
      <SellerDetailPage.Main>
        <SellerDetailPage.MainGeneralSection seller={seller} />
        <ImpersonateSection sellerId={seller.id} />
        <SellerDetailPage.MainOrderSection sellerId={seller.id} />
        <SellerDetailPage.MainProductSection sellerId={seller.id} />
      </SellerDetailPage.Main>
      <SellerDetailPage.Sidebar>
        <SellerDetailPage.SidebarAddressSection seller={seller} />
      </SellerDetailPage.Sidebar>
    </SellerDetailPage>
  );
};

export default SellerDetailWithImpersonate;
