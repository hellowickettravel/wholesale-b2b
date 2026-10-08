-- Wholesale Street launch settings (owner, 8 Oct 2026).
-- Fills the business name and invoice footer, and turns off the minimum order, the delivery charge and
-- the delivery-day limit (no trading rules at launch). Each value is changed ONLY while it still holds
-- the original placeholder or default, so anything already set in Admin > Settings is kept.
-- Re-runnable. No schema change.

update public.settings set business_legal_name = 'Home High Street Limited'
 where business_legal_name like '[%';

update public.settings set invoice_footer = 'Wholesale Street is a trading name of Home High Street Limited, registered in England and Wales, company number 17102079.'
 where invoice_footer like '[%';

update public.settings set min_order_pence = 0 where min_order_pence = 15000;
update public.settings set delivery_charge_pence = 0 where delivery_charge_pence = 1200;
update public.settings set delivery_days = '{1,2,3,4,5,6,7}' where delivery_days = '{1,2,3,4,5,6}';
