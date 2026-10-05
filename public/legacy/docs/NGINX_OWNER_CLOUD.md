# VPS nginx config – owner cloud dashboard

## Ports
- 5055 license_server.py
- 5056 update_server.py
- 5060 owner_saas_dashboard.py

## Example `/etc/nginx/sites-available/sa-invoice-owner`

```nginx
server {
    listen 80;
    server_name owner.yourdomain.co.za;

    location / {
        proxy_pass http://127.0.0.1:5060;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /license/ {
        proxy_pass http://127.0.0.1:5055/;
        proxy_set_header Host $host;
    }

    location /updates/ {
        proxy_pass http://127.0.0.1:5056/;
        proxy_set_header Host $host;
    }
}
```

Then:
```bash
sudo certbot --nginx -d owner.yourdomain.co.za
```

Clients set:
- License server URL: `https://owner.yourdomain.co.za/license`
- Update server URL: `https://owner.yourdomain.co.za/updates`

(Adjust Flask apps if they need path prefixes; simplest is three subdomains.)
