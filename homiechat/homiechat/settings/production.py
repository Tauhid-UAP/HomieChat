from .base import *

DEBUG = False

ALLOWED_HOSTS = [config('HOST1')]

# Database

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': config('MYSQL_DB_NAME'),
        'USER': config('MYSQL_DB_USERNAME'),
        'PASSWORD': config('MYSQL_DB_PASSWORD'),
        'HOST': config('MYSQL_DB_HOSTNAME'),
    }
}

# set STATIC_ROOT for pythonanywhere
# otherwise admin styling will not manifest

STATIC_ROOT = os.path.join(BASE_DIR, 'static')

# HTTPS settings
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = True

# HSTS settings
SECURE_HSTS_SECONDS = 31536000 # 1 year
SECURE_HSTS_PRELOAD = True
SECURE_HSTS_INCLUDE_SUBDOMAINS = True

# Channels
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [('127.0.0.1', 6379)],
        },
    },
}