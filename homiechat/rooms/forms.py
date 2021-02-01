from django import forms

from .models import HomieChatUser, Room, Video

from django.contrib.auth import authenticate

class UserCreationForm(forms.ModelForm):
    email = forms.EmailField(max_length=60, help_text='Required. Add a valid email address.')
    bio = forms.CharField(max_length=60, help_text='Type something about yourself.', required=False)

    class Meta:
        model = HomieChatUser
        fields = ('name', 'email', 'username', 'password1', 'password2',)

class UserAuthenticationForm(forms.ModelForm):
    password = forms.CharField(label='Password', widget=forms.PasswordInput)

    class Meta:
        model = HomieChatUser
        fields = (
            'email',
        )

    def clean(self):
        email = self.cleaned_data['email']
        password = self.cleaned_data['password']

        if not authenticate(email=email, password=password):
            raise forms.ValidationError('Invalid login.')