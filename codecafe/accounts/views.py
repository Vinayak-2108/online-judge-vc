from django.shortcuts import render, redirect
from django.contrib.auth.models import User, auth

# Create your views here.

def login(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']

        user = auth.authenticate(username=username, password=password)
        if user is not None:
            auth.login(request, user)
            return redirect("/")
        else:
            return redirect("/login")
    else:
        return render(request, 'login.html')

def register(request):
    if(request.method =='POST'):
        username = request.POST['username']
        first_name = request.POST['first_name']
        last_name = request.POST['last_name']
        password1 = request.POST['password1']
        password2 = request.POST['password2']
        email = request.POST['email']

        if(password1 == password2):
            if(User.objects.filter(username=username).exists()):
                print("Username already exists")
            elif(User.objects.filter(email=email).exists()):
                print("Email already exists")
                redirect('/accounts/register')
            else:
                user = User.objects.create_user(username=username, email=email, password=password1, first_name=first_name, last_name=last_name)
                user.save()
                print("User created")
                redirect('/accounts/login')


        else:
            print("Password not matching")
        return redirect('/accounts/register')
    else:
        return render(request, 'register.html')
    
def logout(request):
    auth.logout(request)
    return redirect('/')