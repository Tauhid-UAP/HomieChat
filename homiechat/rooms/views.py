from django.shortcuts import render, redirect

from .models import HomieChatUser, Room, Video

from .forms import HomieChatUserCreationForm, UserAuthenticationForm, HomieChatUserUpdateForm

from django.contrib.auth import login, authenticate, logout

from django.views.generic import DetailView, UpdateView

from django.contrib.auth.mixins import LoginRequiredMixin

from django.contrib.auth.decorators import login_required, user_passes_test

# Create your views here.

def user_creation_view(request):
    # go to profile
    # if already logged in
    if request.user.is_authenticated:
        return redirect('user_detail_view', pk=request.user.id)

    context = {}

    if request.method == 'POST':
        usercreationform = HomieChatUserCreationForm(request.POST, request.FILES)

        if usercreationform.is_valid():
            homiechatuser = usercreationform.save()

            email = usercreationform.cleaned_data.get('email')
            raw_password = usercreationform.cleaned_data.get('password1')

            authenticated_account = authenticate(email=email, password=raw_password)
            login(request, authenticated_account)

            return redirect('user_detail_view', pk=homiechatuser.id)
        else:
            context['form'] = usercreationform

    else: # GET request
        usercreationform = HomieChatUserCreationForm()

        context['form'] = usercreationform

    return render(request, 'rooms/user_creation_view.html', context=context)

def login_view(request):
    if request.user.is_authenticated:
        return redirect('user_detail_view', request.user.id)

    context = {}

    # initialize authentication form
    # to avoid UnboundLocalError
    # due to not assigning it
    form = None
    if request.method == 'POST':
        form = UserAuthenticationForm(request.POST)
        if form.is_valid():
            email = request.POST['email']
            password = request.POST['password']
            user = authenticate(email=email, password=password)

            if user:
                login(request, user)
                return redirect('user_detail_view', pk=user.id)

    else:
        form = UserAuthenticationForm()

    context['form'] = form

    return render(request, 'rooms/login_view.html', context)

@login_required
def logout_view(request):
    logout(request)
    return redirect('user_creation_view')

class UserDetailView(LoginRequiredMixin, DetailView):
    model = HomieChatUser
    template_name = 'rooms/user_detail_view.html'

    def get(self, request, pk):
        context = {}

        user = HomieChatUser.objects.get(id=pk)

        # only display the update button
        # if a user is view their own profile
        display_btn_update = False
        if request.user == user:
            display_btn_update = True

        context['user'] = user
        context['display_btn_update'] = display_btn_update

        return render(request, self.template_name, context)

@login_required
def user_update_view(request):
    context = {}

    user = request.user

    if request.method == 'POST':
        form = HomieChatUserUpdateForm(request.POST, request.FILES, instance=user)

        if form.is_valid():
            homiechatuser = form.save()

            return redirect('user_detail_view', pk=request.user.id)
        else:
            context['form'] = form

    else: # GET request
        form = HomieChatUserUpdateForm(instance=user)

        context['form'] = form

    return render(request, 'rooms/user_update_view.html', context=context)

@login_required
def prepare_chat_view(request):
    context = {}

    return render(request, 'rooms/prepare_chat_view.html', context=context)

@login_required
def join_chat_view(request):
    context = {}

    context['username'] = request.user.username

    return render(request, 'rooms/join_chat_view.html', context=context)