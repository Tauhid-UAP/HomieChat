from django.shortcuts import render, redirect

from .models import HomieChatUser, Room, Video

from .forms import UserCreationForm, UserAuthenticationForm

from django.contrib.auth import login, authenticate, logout

from django.views.generic import DetailView

from django.contrib.auth.mixins import LoginRequiredMixin

from django.contrib.auth.decorators import login_required

# Create your views here.

def user_creation_view(request):
    # go to profile
    # if already logged in
    if request.user.is_authenticated:
        return redirect('user_detail_view', pk=request.user.id)

    context = {}

    if request.method == 'POST':
        usercreationform = UserCreationForm(request.POST)

        if usercreationform.is_valid():
            homiechatuser = HomieChatUser.save()

            email = usercreationform.cleaned_data.get('email')
            raw_password = usercreationform.cleaned_data.get('password1')

            authenticated_account = authenticate(email=email, password=raw_password)
            login(request, authenticated_account)

            return redirect('user_profile_view', pk=homiechatuser.id)
        else:
            context['usercreationform'] = usercreationform

    else: # GET request
        usercreationform = UserCreationForm()

        context['usercreationform'] = usercreationform

    return render(request, 'rooms/user_creation_view.html', context=context)

def login_view(request):
    if request.user.is_authenticated:
        return redirect('user_detail_view', pk=request.user.id)

    context = {}

    if request.method == 'POST':
        userauthenticationform = UserAuthenticationForm(request.POST)
        if userauthenticationform.is_valid():
            email = request.POST['email']
            password = request.POST['password']
            user = authenticate(email=email, password=password)

            if user:
                login(request, user)
                return redirect('user_detail_view', pk=user.id)

    else:
        form = UserAuthenticationForm()

    context['form'] = form

    return render(request, 'forms/login_page.html', context)

@login_required
def logout_view(request):
    logout(request)
    return redirect('user_creation_view.html')

class UserDetailView(LoginRequiredMixin, DetailView):
    model = HomieChatUser
    template_name = 'rooms/user_detail_view.html'

    def get(self, request, pk):
        context = {}

        user = HomieChatUser.objects.get(id=pk)

        context['user'] = user

        return render(request, self.template_name, context)