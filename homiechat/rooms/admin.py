from django.contrib import admin

from .models import HomieChatUser, Room, Video

# Register your models here.

admin.site.register(HomieChatUser)
admin.site.register(Room)
admin.site.register(Video)