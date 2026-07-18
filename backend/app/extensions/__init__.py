"""Centralized Flask extension instances.

Extensions are instantiated here without an app and initialized later inside the
application factory. This avoids circular imports and keeps a single source of
truth for every third-party integration.
"""

from flask_caching import Cache
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_mail import Mail
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
mail = Mail()
cors = CORS()
cache = Cache()
limiter = Limiter(key_func=get_remote_address)

__all__ = ["db", "migrate", "jwt", "mail", "cors", "cache", "limiter"]
