# Website source and deployment

This GitHub repository is the source of truth for Adults vs. Kids. Make future website changes here. Preserve existing branding and the book-led homepage. Use Supabase project ivrounrajalbemgdydfc for website Auth and customer data and Vercel project prj_xIz1aYDNDomvM2TdggNMipixKXbC for hosting. Do not create replacement projects or maintain a separate Sites implementation. Never trust incoming oai-authenticated-user-* headers on Vercel. Verify Supabase users server-side and retain row-level security.

Run the production build and account access tests for auth/data changes. Keep registration disabled until production email delivery is verified. Keep checkout closed until real payment processing is implemented and tested. Do not commit credentials.
