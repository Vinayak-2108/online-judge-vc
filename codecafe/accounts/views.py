from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from accounts.serializers import UserSerializer


@api_view(['POST'])
def signup(request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        token = Token.objects.create(user=user)
        return Response(
            {'token': token.key, 'message': "User Created", 'user': serializer.data},
            status=status.HTTP_201_CREATED,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def login(request):
    user = authenticate(
        username=request.data.get('username', ''),
        password=request.data.get('password', ''),
    )
    if user is None:
        return Response({'error': 'Invalid username or password'}, status=status.HTTP_400_BAD_REQUEST)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({'token': token.key, 'tag': True, 'user': UserSerializer(user).data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    Token.objects.filter(user=request.user).delete()
    return Response({'message': 'Logged out'})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def test_token(request):
    return Response({'message': "Passed", 'tag': True, 'username': request.user.username})
