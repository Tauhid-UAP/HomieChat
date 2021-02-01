from django.urls import path
from . import views

# app_name='rooms'

urlpatterns = [
    path('', views.user_creation_view, name='user_creation_view'),
    path('login/', views.login_view, name='login_view'),
    path('logout/', views.logout_view, name='logout_view'),
    path('user_detail_view/<int:pk>/', views.UserDetailView.as_view(), name='user_detail_view')
]