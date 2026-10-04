
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"after": Json | null,"at": string,"before": Json | null,"entity": string,"entity_id": string | null,"id": number
                  }
                  Insert: {
                    "action": string,"actor_id"?: string | null,"after"?: Json | null,"at"?: string,"before"?: Json | null,"entity": string,"entity_id"?: string | null,"id"?: never
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"after"?: Json | null,"at"?: string,"before"?: Json | null,"entity"?: string,"entity_id"?: string | null,"id"?: never
                  }
                  Relationships: [
                    
                  ]
                },"categories": {
                  Row: {
                    "active": boolean,"created_at": string,"default_vat_rate_bp": number,"description": string | null,"id": string,"image_path": string | null,"name": string,"slug": string,"sort": number,"updated_at": string
                  }
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"default_vat_rate_bp"?: number,"description"?: string | null,"id"?: string,"image_path"?: string | null,"name": string,"slug": string,"sort"?: number,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"default_vat_rate_bp"?: number,"description"?: string | null,"id"?: string,"image_path"?: string | null,"name"?: string,"slug"?: string,"sort"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"counters": {
                  Row: {
                    "name": string,"value": number
                  }
                  Insert: {
                    "name": string,"value": number
                  }
                  Update: {
                    "name"?: string,"value"?: number
                  }
                  Relationships: [
                    
                  ]
                },"customer_category_access": {
                  Row: {
                    "category_id": string,"created_at": string,"customer_id": string
                  }
                  Insert: {
                    "category_id": string,"created_at"?: string,"customer_id": string
                  }
                  Update: {
                    "category_id"?: string,"created_at"?: string,"customer_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "customer_category_access_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "customer_category_access_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                },"customer_category_margins": {
                  Row: {
                    "category_id": string,"customer_id": string,"margin_bp": number,"updated_at": string
                  }
                  Insert: {
                    "category_id": string,"customer_id": string,"margin_bp": number,"updated_at"?: string
                  }
                  Update: {
                    "category_id"?: string,"customer_id"?: string,"margin_bp"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "customer_category_margins_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "customer_category_margins_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                },"customer_payments": {
                  Row: {
                    "amount_pence": number,"created_at": string,"customer_id": string,"id": string,"method": Database["public"]['Enums']["payment_method"],"note": string | null,"order_id": string,"paid_on": string,"recorded_by": string | null,"reference": string | null
                  }
                  Insert: {
                    "amount_pence": number,"created_at"?: string,"customer_id": string,"id"?: string,"method"?: Database["public"]['Enums']["payment_method"],"note"?: string | null,"order_id": string,"paid_on": string,"recorded_by"?: string | null,"reference"?: string | null
                  }
                  Update: {
                    "amount_pence"?: number,"created_at"?: string,"customer_id"?: string,"id"?: string,"method"?: Database["public"]['Enums']["payment_method"],"note"?: string | null,"order_id"?: string,"paid_on"?: string,"recorded_by"?: string | null,"reference"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "customer_payments_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "customer_payments_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "customer_orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "customer_payments_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"customer_price_overrides": {
                  Row: {
                    "customer_id": string,"price_pence": number,"updated_at": string,"variant_id": string
                  }
                  Insert: {
                    "customer_id": string,"price_pence": number,"updated_at"?: string,"variant_id": string
                  }
                  Update: {
                    "customer_id"?: string,"price_pence"?: number,"updated_at"?: string,"variant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "customer_price_overrides_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "customer_price_overrides_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "catalogue_variants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "customer_price_overrides_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "product_variants"
      referencedColumns: ["id"]
    }
                  ]
                },"customer_private": {
                  Row: {
                    "admin_notes": string | null,"customer_id": string,"default_margin_bp": number | null,"updated_at": string
                  }
                  Insert: {
                    "admin_notes"?: string | null,"customer_id": string,"default_margin_bp"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "admin_notes"?: string | null,"customer_id"?: string,"default_margin_bp"?: number | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "customer_private_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: true
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                },"customer_product_rules": {
                  Row: {
                    "created_at": string,"customer_id": string,"mode": Database["public"]['Enums']["product_rule_mode"],"product_id": string
                  }
                  Insert: {
                    "created_at"?: string,"customer_id": string,"mode": Database["public"]['Enums']["product_rule_mode"],"product_id": string
                  }
                  Update: {
                    "created_at"?: string,"customer_id"?: string,"mode"?: Database["public"]['Enums']["product_rule_mode"],"product_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "customer_product_rules_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "customer_product_rules_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"customers": {
                  Row: {
                    "address_line1": string | null,"address_line2": string | null,"approved_at": string | null,"approved_by": string | null,"business_name": string,"city": string | null,"contact_name": string | null,"created_at": string,"delivery_notes": string | null,"email": string | null,"id": string,"phone": string | null,"postcode": string | null,"status": Database["public"]['Enums']["customer_status"],"status_reason": string | null,"updated_at": string
                  }
                  Insert: {
                    "address_line1"?: string | null,"address_line2"?: string | null,"approved_at"?: string | null,"approved_by"?: string | null,"business_name": string,"city"?: string | null,"contact_name"?: string | null,"created_at"?: string,"delivery_notes"?: string | null,"email"?: string | null,"id"?: string,"phone"?: string | null,"postcode"?: string | null,"status"?: Database["public"]['Enums']["customer_status"],"status_reason"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "address_line1"?: string | null,"address_line2"?: string | null,"approved_at"?: string | null,"approved_by"?: string | null,"business_name"?: string,"city"?: string | null,"contact_name"?: string | null,"created_at"?: string,"delivery_notes"?: string | null,"email"?: string | null,"id"?: string,"phone"?: string | null,"postcode"?: string | null,"status"?: Database["public"]['Enums']["customer_status"],"status_reason"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"delivery_proofs": {
                  Row: {
                    "created_at": string,"created_by": string | null,"document_path": string | null,"expires_at": string | null,"id": string,"photo_path": string | null,"revoked_at": string | null,"signature_path": string | null,"signed_by_name": string | null,"submitted_at": string | null,"submitted_by_kind": Database["public"]['Enums']["proof_submitter"] | null,"supplier_order_id": string,"token_hash": string | null,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"document_path"?: string | null,"expires_at"?: string | null,"id"?: string,"photo_path"?: string | null,"revoked_at"?: string | null,"signature_path"?: string | null,"signed_by_name"?: string | null,"submitted_at"?: string | null,"submitted_by_kind"?: Database["public"]['Enums']["proof_submitter"] | null,"supplier_order_id": string,"token_hash"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"document_path"?: string | null,"expires_at"?: string | null,"id"?: string,"photo_path"?: string | null,"revoked_at"?: string | null,"signature_path"?: string | null,"signed_by_name"?: string | null,"submitted_at"?: string | null,"submitted_by_kind"?: Database["public"]['Enums']["proof_submitter"] | null,"supplier_order_id"?: string,"token_hash"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "delivery_proofs_supplier_order_id_fkey"
      columns: ["supplier_order_id"]
isOneToOne: false
      referencedRelation: "customer_deliveries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "delivery_proofs_supplier_order_id_fkey"
      columns: ["supplier_order_id"]
isOneToOne: false
      referencedRelation: "supplier_order_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "delivery_proofs_supplier_order_id_fkey"
      columns: ["supplier_order_id"]
isOneToOne: false
      referencedRelation: "supplier_orders"
      referencedColumns: ["id"]
    }
                  ]
                },"email_log": {
                  Row: {
                    "created_at": string,"entity": string | null,"entity_id": string | null,"error": string | null,"id": string,"provider_id": string | null,"status": Database["public"]['Enums']["email_status"],"subject": string,"template": string,"to_email": string
                  }
                  Insert: {
                    "created_at"?: string,"entity"?: string | null,"entity_id"?: string | null,"error"?: string | null,"id"?: string,"provider_id"?: string | null,"status"?: Database["public"]['Enums']["email_status"],"subject": string,"template": string,"to_email": string
                  }
                  Update: {
                    "created_at"?: string,"entity"?: string | null,"entity_id"?: string | null,"error"?: string | null,"id"?: string,"provider_id"?: string | null,"status"?: Database["public"]['Enums']["email_status"],"subject"?: string,"template"?: string,"to_email"?: string
                  }
                  Relationships: [
                    
                  ]
                },"invoices": {
                  Row: {
                    "created_at": string,"customer_id": string,"delivery_net_pence": number,"delivery_vat_pence": number,"goods_net_pence": number,"goods_vat_pence": number,"id": string,"issued_at": string,"number": number,"order_id": string,"total_pence": number,"updated_at": string,"vat_pence": number,"voided_at": string | null
                  }
                  Insert: {
                    "created_at"?: string,"customer_id": string,"delivery_net_pence": number,"delivery_vat_pence": number,"goods_net_pence": number,"goods_vat_pence": number,"id"?: string,"issued_at"?: string,"number": number,"order_id": string,"total_pence": number,"updated_at"?: string,"vat_pence": number,"voided_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"customer_id"?: string,"delivery_net_pence"?: number,"delivery_vat_pence"?: number,"goods_net_pence"?: number,"goods_vat_pence"?: number,"id"?: string,"issued_at"?: string,"number"?: number,"order_id"?: string,"total_pence"?: number,"updated_at"?: string,"vat_pence"?: number,"voided_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "invoices_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoices_order_id_fkey"
      columns: ["order_id"]
isOneToOne: true
      referencedRelation: "customer_orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoices_order_id_fkey"
      columns: ["order_id"]
isOneToOne: true
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string | null,"created_at": string,"id": string,"kind": string,"link": string | null,"read_at": string | null,"title": string,"user_id": string
                  }
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"id"?: string,"kind": string,"link"?: string | null,"read_at"?: string | null,"title": string,"user_id": string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"id"?: string,"kind"?: string,"link"?: string | null,"read_at"?: string | null,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"order_items": {
                  Row: {
                    "created_at": string,"id": string,"line_net_pence": number,"line_vat_pence": number,"order_id": string,"product_id": string | null,"product_name": string,"qty": number,"size_label": string,"sku": string | null,"sort": number,"supplier_id": string,"supplier_order_id": string,"unit_cost_pence": number | null,"unit_price_pence": number,"updated_at": string,"variant_id": string | null,"vat_rate_bp": number
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"line_net_pence": number,"line_vat_pence": number,"order_id": string,"product_id"?: string | null,"product_name": string,"qty": number,"size_label": string,"sku"?: string | null,"sort"?: number,"supplier_id": string,"supplier_order_id": string,"unit_cost_pence"?: number | null,"unit_price_pence": number,"updated_at"?: string,"variant_id"?: string | null,"vat_rate_bp": number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"line_net_pence"?: number,"line_vat_pence"?: number,"order_id"?: string,"product_id"?: string | null,"product_name"?: string,"qty"?: number,"size_label"?: string,"sku"?: string | null,"sort"?: number,"supplier_id"?: string,"supplier_order_id"?: string,"unit_cost_pence"?: number | null,"unit_price_pence"?: number,"updated_at"?: string,"variant_id"?: string | null,"vat_rate_bp"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_items_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "customer_orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "my_supplier"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "suppliers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_supplier_order_id_fkey"
      columns: ["supplier_order_id"]
isOneToOne: false
      referencedRelation: "customer_deliveries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_supplier_order_id_fkey"
      columns: ["supplier_order_id"]
isOneToOne: false
      referencedRelation: "supplier_order_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_supplier_order_id_fkey"
      columns: ["supplier_order_id"]
isOneToOne: false
      referencedRelation: "supplier_orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "catalogue_variants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "product_variants"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "cancelled_at": string | null,"completed_at": string | null,"created_at": string,"customer_id": string,"delivery_address": string,"delivery_date": string,"delivery_net_pence": number,"delivery_vat_pence": number,"goods_net_pence": number,"goods_vat_pence": number,"id": string,"locked_at": string | null,"next_chase_date": string | null,"note": string | null,"number": number,"payment_notes": string | null,"payment_terms": Database["public"]['Enums']["payment_terms"],"placed_by": string | null,"promised_pay_date": string | null,"status": Database["public"]['Enums']["order_status"],"total_pence": number,"updated_at": string,"vat_pence": number
                  }
                  Insert: {
                    "cancelled_at"?: string | null,"completed_at"?: string | null,"created_at"?: string,"customer_id": string,"delivery_address": string,"delivery_date": string,"delivery_net_pence"?: number,"delivery_vat_pence"?: number,"goods_net_pence": number,"goods_vat_pence": number,"id"?: string,"locked_at"?: string | null,"next_chase_date"?: string | null,"note"?: string | null,"number": number,"payment_notes"?: string | null,"payment_terms"?: Database["public"]['Enums']["payment_terms"],"placed_by"?: string | null,"promised_pay_date"?: string | null,"status"?: Database["public"]['Enums']["order_status"],"total_pence": number,"updated_at"?: string,"vat_pence": number
                  }
                  Update: {
                    "cancelled_at"?: string | null,"completed_at"?: string | null,"created_at"?: string,"customer_id"?: string,"delivery_address"?: string,"delivery_date"?: string,"delivery_net_pence"?: number,"delivery_vat_pence"?: number,"goods_net_pence"?: number,"goods_vat_pence"?: number,"id"?: string,"locked_at"?: string | null,"next_chase_date"?: string | null,"note"?: string | null,"number"?: number,"payment_notes"?: string | null,"payment_terms"?: Database["public"]['Enums']["payment_terms"],"placed_by"?: string | null,"promised_pay_date"?: string | null,"status"?: Database["public"]['Enums']["order_status"],"total_pence"?: number,"updated_at"?: string,"vat_pence"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    }
                  ]
                },"product_variants": {
                  Row: {
                    "active": boolean,"cost_pence": number | null,"created_at": string,"id": string,"image_path": string | null,"product_id": string,"size_label": string,"size_sort": number,"sku": string | null,"source_ref": string | null,"supplier_id": string | null,"updated_at": string,"vat_rate_bp": number
                  }
                  Insert: {
                    "active"?: boolean,"cost_pence"?: number | null,"created_at"?: string,"id"?: string,"image_path"?: string | null,"product_id": string,"size_label": string,"size_sort"?: number,"sku"?: string | null,"source_ref"?: string | null,"supplier_id"?: string | null,"updated_at"?: string,"vat_rate_bp"?: number
                  }
                  Update: {
                    "active"?: boolean,"cost_pence"?: number | null,"created_at"?: string,"id"?: string,"image_path"?: string | null,"product_id"?: string,"size_label"?: string,"size_sort"?: number,"sku"?: string | null,"source_ref"?: string | null,"supplier_id"?: string | null,"updated_at"?: string,"vat_rate_bp"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_variants_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_variants_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "my_supplier"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_variants_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "suppliers"
      referencedColumns: ["id"]
    }
                  ]
                },"products": {
                  Row: {
                    "active": boolean,"category_id": string,"created_at": string,"description": string | null,"id": string,"image_path": string | null,"name": string,"slug": string,"source": string | null,"source_ref": string | null,"updated_at": string
                  }
                  Insert: {
                    "active"?: boolean,"category_id": string,"created_at"?: string,"description"?: string | null,"id"?: string,"image_path"?: string | null,"name": string,"slug": string,"source"?: string | null,"source_ref"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"category_id"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"image_path"?: string | null,"name"?: string,"slug"?: string,"source"?: string | null,"source_ref"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "products_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "active": boolean,"created_at": string,"customer_id": string | null,"email": string | null,"full_name": string | null,"id": string,"phone": string | null,"role": Database["public"]['Enums']["user_role"],"supplier_id": string | null,"updated_at": string
                  }
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"customer_id"?: string | null,"email"?: string | null,"full_name"?: string | null,"id": string,"phone"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"supplier_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"customer_id"?: string | null,"email"?: string | null,"full_name"?: string | null,"id"?: string,"phone"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"supplier_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profiles_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "my_supplier"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profiles_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "suppliers"
      referencedColumns: ["id"]
    }
                  ]
                },"rate_limits": {
                  Row: {
                    "count": number,"key": string,"window_start": string
                  }
                  Insert: {
                    "count"?: number,"key": string,"window_start": string
                  }
                  Update: {
                    "count"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"settings": {
                  Row: {
                    "bank_account_name": string,"bank_account_number": string,"bank_iban": string | null,"bank_name": string,"bank_sort_code": string,"business_address": string,"business_legal_name": string,"delivery_charge_pence": number,"delivery_days": (number)[],"delivery_fixed_vat_bp": number,"delivery_vat_mode": Database["public"]['Enums']["delivery_vat_mode"],"global_margin_bp": number,"id": boolean,"invoice_footer": string,"min_order_pence": number,"show_prices_inc_vat": boolean,"updated_at": string,"vat_number": string
                  }
                  Insert: {
                    "bank_account_name"?: string,"bank_account_number"?: string,"bank_iban"?: string | null,"bank_name"?: string,"bank_sort_code"?: string,"business_address"?: string,"business_legal_name"?: string,"delivery_charge_pence"?: number,"delivery_days"?: (number)[],"delivery_fixed_vat_bp"?: number,"delivery_vat_mode"?: Database["public"]['Enums']["delivery_vat_mode"],"global_margin_bp"?: number,"id"?: boolean,"invoice_footer"?: string,"min_order_pence"?: number,"show_prices_inc_vat"?: boolean,"updated_at"?: string,"vat_number"?: string
                  }
                  Update: {
                    "bank_account_name"?: string,"bank_account_number"?: string,"bank_iban"?: string | null,"bank_name"?: string,"bank_sort_code"?: string,"business_address"?: string,"business_legal_name"?: string,"delivery_charge_pence"?: number,"delivery_days"?: (number)[],"delivery_fixed_vat_bp"?: number,"delivery_vat_mode"?: Database["public"]['Enums']["delivery_vat_mode"],"global_margin_bp"?: number,"id"?: boolean,"invoice_footer"?: string,"min_order_pence"?: number,"show_prices_inc_vat"?: boolean,"updated_at"?: string,"vat_number"?: string
                  }
                  Relationships: [
                    
                  ]
                },"supplier_orders": {
                  Row: {
                    "created_at": string,"delivered_at": string | null,"id": string,"order_id": string,"paid_to_supplier": boolean,"sent_at": string | null,"status": Database["public"]['Enums']["supplier_order_status"],"supplier_id": string,"supplier_paid_at": string | null,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"delivered_at"?: string | null,"id"?: string,"order_id": string,"paid_to_supplier"?: boolean,"sent_at"?: string | null,"status"?: Database["public"]['Enums']["supplier_order_status"],"supplier_id": string,"supplier_paid_at"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"delivered_at"?: string | null,"id"?: string,"order_id"?: string,"paid_to_supplier"?: boolean,"sent_at"?: string | null,"status"?: Database["public"]['Enums']["supplier_order_status"],"supplier_id"?: string,"supplier_paid_at"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "supplier_orders_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "customer_orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "supplier_orders_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "supplier_orders_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "my_supplier"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "supplier_orders_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "suppliers"
      referencedColumns: ["id"]
    }
                  ]
                },"supplier_payments": {
                  Row: {
                    "amount_pence": number,"created_at": string,"id": string,"method": Database["public"]['Enums']["payment_method"],"note": string | null,"paid_on": string,"recorded_by": string | null,"reference": string | null,"supplier_id": string,"supplier_order_id": string
                  }
                  Insert: {
                    "amount_pence": number,"created_at"?: string,"id"?: string,"method"?: Database["public"]['Enums']["payment_method"],"note"?: string | null,"paid_on": string,"recorded_by"?: string | null,"reference"?: string | null,"supplier_id": string,"supplier_order_id": string
                  }
                  Update: {
                    "amount_pence"?: number,"created_at"?: string,"id"?: string,"method"?: Database["public"]['Enums']["payment_method"],"note"?: string | null,"paid_on"?: string,"recorded_by"?: string | null,"reference"?: string | null,"supplier_id"?: string,"supplier_order_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "supplier_payments_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "my_supplier"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "supplier_payments_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "suppliers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "supplier_payments_supplier_order_id_fkey"
      columns: ["supplier_order_id"]
isOneToOne: false
      referencedRelation: "customer_deliveries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "supplier_payments_supplier_order_id_fkey"
      columns: ["supplier_order_id"]
isOneToOne: false
      referencedRelation: "supplier_order_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "supplier_payments_supplier_order_id_fkey"
      columns: ["supplier_order_id"]
isOneToOne: false
      referencedRelation: "supplier_orders"
      referencedColumns: ["id"]
    }
                  ]
                },"suppliers": {
                  Row: {
                    "active": boolean,"address": string | null,"created_at": string,"email": string | null,"id": string,"name": string,"notes": string | null,"phone": string | null,"updated_at": string
                  }
                  Insert: {
                    "active"?: boolean,"address"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: string,"name": string,"notes"?: string | null,"phone"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"address"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: string,"name"?: string,"notes"?: string | null,"phone"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "catalogue_variants": {
                  Row: {
                    "id": string | null,"image_path": string | null,"product_id": string | null,"size_label": string | null,"size_sort": number | null,"sku": string | null,"vat_rate_bp": number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_variants_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"customer_deliveries": {
                  Row: {
                    "delivered_at": string | null,"id": string | null,"order_id": string | null,"status": Database["public"]['Enums']["supplier_order_status"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "supplier_orders_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "customer_orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "supplier_orders_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"customer_order_items": {
                  Row: {
                    "id": string | null,"line_net_pence": number | null,"line_vat_pence": number | null,"order_id": string | null,"product_id": string | null,"product_name": string | null,"qty": number | null,"size_label": string | null,"sku": string | null,"sort": number | null,"supplier_order_id": string | null,"unit_price_pence": number | null,"vat_rate_bp": number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_items_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "customer_orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_supplier_order_id_fkey"
      columns: ["supplier_order_id"]
isOneToOne: false
      referencedRelation: "customer_deliveries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_supplier_order_id_fkey"
      columns: ["supplier_order_id"]
isOneToOne: false
      referencedRelation: "supplier_order_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_supplier_order_id_fkey"
      columns: ["supplier_order_id"]
isOneToOne: false
      referencedRelation: "supplier_orders"
      referencedColumns: ["id"]
    }
                  ]
                },"customer_orders": {
                  Row: {
                    "created_at": string | null,"delivery_address": string | null,"delivery_date": string | null,"delivery_net_pence": number | null,"delivery_vat_pence": number | null,"goods_net_pence": number | null,"goods_vat_pence": number | null,"id": string | null,"note": string | null,"number": number | null,"payment_terms": Database["public"]['Enums']["payment_terms"] | null,"promised_pay_date": string | null,"status": Database["public"]['Enums']["order_status"] | null,"total_pence": number | null,"updated_at": string | null,"vat_pence": number | null
                  }
                  Insert: {
                           "created_at"?: string | null,"delivery_address"?: string | null,"delivery_date"?: string | null,"delivery_net_pence"?: number | null,"delivery_vat_pence"?: number | null,"goods_net_pence"?: number | null,"goods_vat_pence"?: number | null,"id"?: string | null,"note"?: string | null,"number"?: number | null,"payment_terms"?: Database["public"]['Enums']["payment_terms"] | null,"promised_pay_date"?: string | null,"status"?: Database["public"]['Enums']["order_status"] | null,"total_pence"?: number | null,"updated_at"?: string | null,"vat_pence"?: number | null
                         }
                        Update: {
                           "created_at"?: string | null,"delivery_address"?: string | null,"delivery_date"?: string | null,"delivery_net_pence"?: number | null,"delivery_vat_pence"?: number | null,"goods_net_pence"?: number | null,"goods_vat_pence"?: number | null,"id"?: string | null,"note"?: string | null,"number"?: number | null,"payment_terms"?: Database["public"]['Enums']["payment_terms"] | null,"promised_pay_date"?: string | null,"status"?: Database["public"]['Enums']["order_status"] | null,"total_pence"?: number | null,"updated_at"?: string | null,"vat_pence"?: number | null
                         }
                        Relationships: [
                    
                  ]
                },"customer_payment_history": {
                  Row: {
                    "amount_pence": number | null,"id": string | null,"method": Database["public"]['Enums']["payment_method"] | null,"order_id": string | null,"paid_on": string | null,"reference": string | null
                  }
                  Insert: {
                           "amount_pence"?: number | null,"id"?: string | null,"method"?: Database["public"]['Enums']["payment_method"] | null,"order_id"?: string | null,"paid_on"?: string | null,"reference"?: string | null
                         }
                        Update: {
                           "amount_pence"?: number | null,"id"?: string | null,"method"?: Database["public"]['Enums']["payment_method"] | null,"order_id"?: string | null,"paid_on"?: string | null,"reference"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "customer_payments_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "customer_orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "customer_payments_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"my_supplier": {
                  Row: {
                    "address": string | null,"email": string | null,"id": string | null,"name": string | null,"phone": string | null
                  }
                  Insert: {
                           "address"?: string | null,"email"?: string | null,"id"?: string | null,"name"?: string | null,"phone"?: string | null
                         }
                        Update: {
                           "address"?: string | null,"email"?: string | null,"id"?: string | null,"name"?: string | null,"phone"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"shop_settings": {
                  Row: {
                    "bank_account_name": string | null,"bank_account_number": string | null,"bank_iban": string | null,"bank_name": string | null,"bank_sort_code": string | null,"business_address": string | null,"business_legal_name": string | null,"delivery_charge_pence": number | null,"delivery_days": (number)[] | null,"delivery_fixed_vat_bp": number | null,"delivery_vat_mode": Database["public"]['Enums']["delivery_vat_mode"] | null,"invoice_footer": string | null,"min_order_pence": number | null,"show_prices_inc_vat": boolean | null,"vat_number": string | null
                  }
                  Insert: {
                           "bank_account_name"?: string | null,"bank_account_number"?: string | null,"bank_iban"?: string | null,"bank_name"?: string | null,"bank_sort_code"?: string | null,"business_address"?: string | null,"business_legal_name"?: string | null,"delivery_charge_pence"?: number | null,"delivery_days"?: (number)[] | null,"delivery_fixed_vat_bp"?: number | null,"delivery_vat_mode"?: Database["public"]['Enums']["delivery_vat_mode"] | null,"invoice_footer"?: string | null,"min_order_pence"?: number | null,"show_prices_inc_vat"?: boolean | null,"vat_number"?: string | null
                         }
                        Update: {
                           "bank_account_name"?: string | null,"bank_account_number"?: string | null,"bank_iban"?: string | null,"bank_name"?: string | null,"bank_sort_code"?: string | null,"business_address"?: string | null,"business_legal_name"?: string | null,"delivery_charge_pence"?: number | null,"delivery_days"?: (number)[] | null,"delivery_fixed_vat_bp"?: number | null,"delivery_vat_mode"?: Database["public"]['Enums']["delivery_vat_mode"] | null,"invoice_footer"?: string | null,"min_order_pence"?: number | null,"show_prices_inc_vat"?: boolean | null,"vat_number"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"supplier_order_lines": {
                  Row: {
                    "id": string | null,"product_name": string | null,"qty": number | null,"size_label": string | null,"sku": string | null,"sort": number | null,"supplier_order_id": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_items_supplier_order_id_fkey"
      columns: ["supplier_order_id"]
isOneToOne: false
      referencedRelation: "customer_deliveries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_supplier_order_id_fkey"
      columns: ["supplier_order_id"]
isOneToOne: false
      referencedRelation: "supplier_order_list"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_supplier_order_id_fkey"
      columns: ["supplier_order_id"]
isOneToOne: false
      referencedRelation: "supplier_orders"
      referencedColumns: ["id"]
    }
                  ]
                },"supplier_order_list": {
                  Row: {
                    "created_at": string | null,"customer_contact": string | null,"customer_name": string | null,"customer_phone": string | null,"delivered_at": string | null,"delivery_address": string | null,"delivery_date": string | null,"id": string | null,"order_id": string | null,"order_note": string | null,"order_number": number | null,"paid_to_supplier": boolean | null,"sent_at": string | null,"status": Database["public"]['Enums']["supplier_order_status"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "supplier_orders_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "customer_orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "supplier_orders_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "app_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["user_role"]
                           },
"clean_text":
{ Args: { "p": string,"p_max": number }; Returns: string
                           },
"create_order_tx":
{ Args: { "p": Json }; Returns: Json
                           },
"ensure_policy":
{ Args: { "p_check"?: string,"p_command": string,"p_name": string,"p_roles": string,"p_schema": string,"p_table": string,"p_using"?: string }; Returns: undefined
                           },
"hit_rate_limit":
{ Args: { "p_key": string,"p_limit": number,"p_window_seconds": number }; Returns: boolean
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"my_approved_customer_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"my_customer_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"my_supplier_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"next_counter":
{ Args: { "p_name": string }; Returns: number
                           },
"promote_to_admin":
{ Args: { "p_email": string }; Returns: undefined
                           }
          }
          Enums: {
            "customer_status": "pending"|"approved"|"rejected"|"suspended","delivery_vat_mode": "apportioned"|"fixed","email_status": "queued"|"sent"|"failed"|"skipped","order_status": "placed"|"sent"|"out_for_delivery"|"partially_delivered"|"delivered"|"completed"|"cancelled","payment_method": "bank_transfer"|"cash"|"cheque"|"card"|"other","payment_terms": "on_delivery"|"within_7_days"|"on_date","product_rule_mode": "allow"|"deny","proof_submitter": "driver"|"supplier"|"admin","supplier_order_status": "placed"|"sent"|"out_for_delivery"|"delivered"|"cancelled","user_role": "customer"|"admin"|"supplier"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "customer_status": ["pending", "approved", "rejected", "suspended"],"delivery_vat_mode": ["apportioned", "fixed"],"email_status": ["queued", "sent", "failed", "skipped"],"order_status": ["placed", "sent", "out_for_delivery", "partially_delivered", "delivered", "completed", "cancelled"],"payment_method": ["bank_transfer", "cash", "cheque", "card", "other"],"payment_terms": ["on_delivery", "within_7_days", "on_date"],"product_rule_mode": ["allow", "deny"],"proof_submitter": ["driver", "supplier", "admin"],"supplier_order_status": ["placed", "sent", "out_for_delivery", "delivered", "cancelled"],"user_role": ["customer", "admin", "supplier"]
          }
        }
} as const
