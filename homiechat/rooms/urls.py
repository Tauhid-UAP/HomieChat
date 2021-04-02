from django.urls import path
from . import views

# app_name='rooms'

urlpatterns = [
    path('', views.user_creation_view, name='user_creation_view'),
    path('login_view/', views.login_view, name='login_view'),
    path('logout_view/', views.logout_view, name='logout_view'),
    path('user_detail_view/<int:pk>/', views.UserDetailView.as_view(), name='user_detail_view'),
    path('user_update_view/', views.user_update_view, name='user_update_view'),
    path('prepare_chat_view/', views.prepare_chat_view, name='prepare_chat_view'),
    path('join_chat_view/<str:room_code>/', views.join_chat_view, name='join_chat_view'),
    path('room_list_view/', views.RoomListView.as_view(), name='room_list_view'),
    path('room_creation_view/', views.room_creation_view, name='room_creation_view'),
    path('select_room_view/', views.select_room_view, name='select_room_view'),
]