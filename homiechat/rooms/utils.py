from django.core.signing import Signer

from twilio.rest import Client as TwilioClient
from twilio.rest.api.v2010.account.token import TokenInstance

from decouple import config

from typing import List

def generate_room_code(room_id):
    str_room_id = str(room_id)
    print('str_room_id: ', str_room_id)

    # generate room code
    # by signing on room_id with user id salt
    signer = Signer()

    # if room id is 5
    # generated code will be '5:<string of size 43>'
    # exclude '5:'
    room_code = signer.sign(str_room_id)[(len(str_room_id) + 1):]
    print('room_code: ', room_code)

    return room_code

class TwilioClientHandler:
    def __init__(self, twilio_client: TwilioClient):
        self.twilio_client = twilio_client

    def create_token(self) -> TokenInstance:
        return self.twilio_client.tokens.create()

def build_twilio_client_handler(account_sid: str, auth_token: str) -> TwilioClientHandler:
    twilio_client: TwilioClient = TwilioClient(account_sid, auth_token)
    return TwilioClientHandler(twilio_client)

def create_twilio_token(account_sid: str, auth_token: str) -> TokenInstance:
    twilio_client_handler: TwilioClientHandler = build_twilio_client_handler(account_sid, auth_token)
    return twilio_client_handler.create_token()

def create_twilio_token_from_environment_credentials() -> TokenInstance:
    account_sid: str = config('TWILIO_ACCOUNT_SID')
    auth_token: str = config('TWILIO_AUTH_TOKEN')
    return create_twilio_token(account_sid, auth_token)

def get_ice_servers_from_twilio_token(twilio_token: TokenInstance) -> List[dict]:
    return twilio_token.ice_servers

def get_ice_servers() -> List[dict]:
    """Implement caching"""

    twilio_token: TokenInstance = create_twilio_token_from_environment_credentials()
    return get_ice_servers_from_twilio_token(twilio_token)