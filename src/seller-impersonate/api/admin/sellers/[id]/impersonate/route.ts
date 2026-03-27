import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils";
import { MercurModules } from "@mercurjs/types";

import { generateImpersonateJwtTokenForAuthIdentity } from "../../../../../utils/generate-impersonate-jwt-token";

/**
 * @oas [post] /admin/sellers/{id}/impersonate
 * operationId: "AdminImpersonateSeller"
 * summary: "Impersonate Seller"
 * description: "Generates an impersonation JWT token that allows the admin to act on behalf of the seller. The token is valid for 2 hours."
 * x-authenticated: true
 * parameters:
 *   - name: id
 *     in: path
 *     required: true
 *     schema:
 *       type: string
 * responses:
 *   "200":
 *     description: OK
 * tags:
 *   - Admin Sellers
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const sellerModule = req.scope.resolve(MercurModules.SELLER);
  const { id } = req.params;

  const seller = await sellerModule.retrieveSeller(id);

  const {
    data: [authIdentity],
  } = await query.graph({
    entity: "auth_identity",
    fields: ["*"],
    filters: {
      app_metadata: {
        seller_id: seller.id,
      },
    },
  });

  if (!authIdentity) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Auth identity not found",
    );
  }

  const token = generateImpersonateJwtTokenForAuthIdentity(
    {
      authIdentity,
      actorType: "seller",
      authProvider: "emailpass",
      impersonation: {
        active: true,
        impersonated_by: req.auth_context.actor_id,
        started_at: new Date().toISOString(),
      },
    },
    {
      secret: req.scope.resolve("configModule").projectConfig.http.jwtSecret,
      expiresIn: "2h",
    },
  );

  return res.json({ token });
};
