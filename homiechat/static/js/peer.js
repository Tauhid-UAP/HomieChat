// map peer usernames to corresponding RTCPeerConnections
// as key value pairs
var mapPeers = {};

// peers that stream own screen
// to remote peers
var mapScreenPeers = {};

// true if screen is being shared
// false otherwise
var screenShared = false;

const localVideo = document.querySelector('#local-video');

// button to start or stop screen sharing
var btnShareScreen = document.querySelector('#btn-share-screen');

// local video stream
var localStream = new MediaStream();

// local screen stream
// for screen sharing
var localDisplayStream = new MediaStream();

// buttons to toggle self audio and video
btnToggleAudio = document.querySelector("#btn-toggle-audio");
btnToggleVideo = document.querySelector("#btn-toggle-video");

var btnSendMsg = document.querySelector('#btn-send-msg');
var messageInput = document.querySelector('#msg');

// button to start or stop screen recording
var btnRecordScreen = document.querySelector('#btn-record-screen');
// object that will start or stop screen recording
var recorder;
// true of currently recording, false otherwise
var recording = false;

// var file;

// document.getElementById('share-file-button').addEventListener('click', () => {
//     document.getElementById('select-file-dialog').style.display = 'block';
// });
  
// document.getElementById('cancel-button').addEventListener('click', () => {
//     document.getElementById('select-file-input').value = '';
//     document.getElementById('select-file-dialog').style.display = 'none';
// });
  
// document.getElementById('select-file-input').addEventListener('change', (event) => {
//     file = event.target.files[0];
//     document.getElementById('ok-button').disabled = !file;
// });

// ul of messages
var ul = document.querySelector("#message-list");

var loc = window.location;

var endPoint = '';
var wsStart = 'ws://';

if(loc.protocol == 'https:'){
    wsStart = 'wss://';
}

var endPoint = wsStart + loc.host + loc.pathname;

var webSocket;

var btnJoin = document.querySelector('#btn-join');

// join room (initiate websocket connection)
// upon button click
btnJoin.onclick = () => {
    // disable and vanish join button
    btnJoin.disabled = true;
    btnJoin.style.visibility = 'hidden';

    webSocket = new WebSocket(endPoint);

    webSocket.onopen = function(e){
        console.log('Connection opened! ', e);

        // notify other peers
        sendSignal('new-peer', {
            'local_screen_sharing': false,
        });
    }
    
    webSocket.onmessage = webSocketOnMessage;
    
    webSocket.onclose = function(e){
        console.log('Connection closed! ', e);
    }
    
    webSocket.onerror = function(e){
        console.log('Error occured! ', e);
    }

    btnSendMsg.disabled = false;
    messageInput.disabled = false;
}

function webSocketOnMessage(event){
    var parsedData = JSON.parse(event.data);

    var action = parsedData['action'];
    // username of other peer
    var peerUsername = parsedData['peer'];
    
    console.log('%s sent %s', peerUsername, action);

    if(peerUsername == username){
        // ignore all messages from oneself
        return;
    }

    // boolean value specified by other peer
    // indicates whether the other peer is sharing screen
    var remoteScreenSharing = parsedData['message']['local_screen_sharing'];
    console.log('remoteScreenSharing: ', remoteScreenSharing);
    
    // channel name of the sender of this message
    // used to send messages back to that sender
    // hence, receiver_channel_name
    var receiver_channel_name = parsedData['message']['receiver_channel_name'];
    console.log('receiver_channel_name: ', receiver_channel_name);

    // in case of new peer
    if(action == 'new-peer'){
        // create new RTCPeerConnection
        createOfferer(peerUsername, false, remoteScreenSharing, receiver_channel_name);

        if(screenShared && !remoteScreenSharing){
            // if local screen is being shared
            // and remote peer is not sharing screen
            // send offer from screen sharing peer
            console.log('Creating screen sharing offer.');
            createOfferer(peerUsername, true, remoteScreenSharing, receiver_channel_name);
        }
        
        return;
    }

    // remote_screen_sharing from the remote peer
    // will be local screen sharing info for this peer
    var localScreenSharing = parsedData['message']['remote_screen_sharing'];

    if(action == 'new-offer'){
        // create new RTCPeerConnection
        // set offer as remote description
        var offer = parsedData['message']['sdp'];
        console.log('Offer: ', offer);
        var peer = createAnswerer(offer, peerUsername, localScreenSharing, remoteScreenSharing, receiver_channel_name);

        return;
    }
    

    if(action == 'new-answer'){
        // in case of answer to previous offer
        // get the corresponding RTCPeerConnection
        var peer = null;
        
        if(remoteScreenSharing){
            // if answerer is screen sharer
            peer = mapPeers[peerUsername + ' Screen'][0];
        }else if(localScreenSharing){
            // if offerer was screen sharer
            peer = mapScreenPeers[peerUsername][0];
        }else{
            // if both are non-screen sharers
            peer = mapPeers[peerUsername][0];
        }

        // get the answer
        var answer = parsedData['message']['sdp'];
        console.log('answer: ', answer);

        // set remote description of the RTCPeerConnection
        peer.setRemoteDescription(answer);

        return;
    }

    if(action == 'new-ice-candidate') {
        handleNewIceCandidateFromRemotePeer(parsedData['message']['candidate'], peerUsername);
        return
    }
}

messageInput.addEventListener('keyup', function(event){
    if(event.keyCode == 13){
        // prevent from putting 'Enter' as input
        event.preventDefault();

        // click send message button
        btnSendMsg.click();
    }
});

btnSendMsg.onclick = btnSendMsgOnClick;

function btnSendMsgOnClick(){
    var message = messageInput.value;
    
    var li = document.createElement("li");
    li.appendChild(document.createTextNode("Me: " + message));
    ul.appendChild(li);
    
    var dataChannels = getDataChannels();

    console.log('Sending: ', message);

    // send to all data channels
    for(index in dataChannels){
        dataChannels[index].send(username + ': ' + message);
    }
    
    messageInput.value = '';
}

const constraints = {
    'video': true,
    'audio': true
}

// const iceConfiguration = {
//     iceServers: [
//         {
//             urls: ['turn:numb.viagenie.ca'],
//             credential: '{{numb_turn_credential}}',
//             username: '{{numb_turn_username}}'
//         }
//     ]
// };

// const iceConfiguration = {
//     iceServers: [
//         {
//             urls: ['stun:128.199.23.166:3478'],
//             credential: 'tauhidpass',
//             username: 'tauhidturn'
//         },

//         {
//             urls: ['turn:128.199.23.166:3478'],
//             credential: 'tauhidpass',
//             username: 'tauhidturn'
//         }
//     ]
// };

const iceConfiguration = {
    iceServers: iceServers
}

// const iceConfiguration = null;

userMedia = navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
        localStream = stream;
        console.log('Got MediaStream:', stream);
        
        // var mediaTracks = stream.getTracks();        
        // for(i=0; i < mediaTracks.length; i++){
        //     console.log(mediaTracks[i]);
        // }
        
        localVideo.srcObject = localStream;
        localVideo.muted = true;

        window.stream = stream; // make variable available to browser console

        audioTracks = stream.getAudioTracks();
        videoTracks = stream.getVideoTracks();

        // unmute audio and video by default
        audioTracks[0].enabled = true;
        videoTracks[0].enabled = true;

        btnToggleAudio.onclick = function(){
            audioTracks[0].enabled = !audioTracks[0].enabled;
            if(audioTracks[0].enabled){
                btnToggleAudio.innerHTML = 'Audio Mute';
                return;
            }
            
            btnToggleAudio.innerHTML = 'Audio Unmute';
        };

        btnToggleVideo.onclick = function(){
            videoTracks[0].enabled = !videoTracks[0].enabled;
            if(videoTracks[0].enabled){
                btnToggleVideo.innerHTML = 'Video Off';
                return;
            }

            btnToggleVideo.innerHTML = 'Video On';
        };
    })
    .then(e => {
        btnShareScreen.onclick = event => {
            if(screenShared){
                // toggle screenShared
                screenShared = !screenShared;

                // set to own video
                // if screen already shared
                localVideo.srcObject = localStream;
                btnShareScreen.innerHTML = 'Share screen';

                // get screen sharing video element
                var localScreen = document.querySelector('#my-screen-video');
                // remove it
                removeVideo(localScreen);

                // close all screen share peer connections
                var screenPeers = getPeers(mapScreenPeers);
                for(index in screenPeers){
                    screenPeers[index].close();
                }
                // empty the screen sharing peer storage object
                mapScreenPeers = {};

                return;
            }
            
            // toggle screenShared
            screenShared = !screenShared;

            navigator.mediaDevices.getDisplayMedia(constraints)
                .then(stream => {
                    localDisplayStream = stream;
                    
                    // var mediaTracks = stream.getTracks();
                    // for(i=0; i < mediaTracks.length; i++){
                    //     console.log(mediaTracks[i]);
                    // }

                    var localScreen = createVideo('my-screen');
                    // set to display stream
                    // if screen not shared
                    localScreen.srcObject = localDisplayStream;

                    // notify other peers
                    // of screen sharing peer
                    sendSignal('new-peer', {
                        'local_screen_sharing': true,
                    });
                })
                .catch(error => {
                    console.log('Error accessing display media.', error);
                });

            btnShareScreen.innerHTML = 'Stop sharing';
        }
    })
    .then(e => {
        btnRecordScreen.addEventListener('click', () => {
            if(recording){
                // toggle recording
                recording = !recording;

                btnRecordScreen.innerHTML = 'Record Screen';

                recorder.stopRecording(function() {
                    var blob = recorder.getBlob();
                    invokeSaveAsDialog(blob);
                });

                return;
            }
            
            // toggle recording
            recording = !recording;

            navigator.mediaDevices.getDisplayMedia(constraints)
                .then(stream => {
                    recorder = RecordRTC(stream, {
                        type: 'video',
                        MimeType: 'video/webm'
                    });
                    recorder.startRecording();
                    
                    // var mediaTracks = stream.getTracks();
                    // for(i=0; i < mediaTracks.length; i++){
                    //     console.log(mediaTracks[i]);
                    // }

                })
                .catch(error => {
                    console.log('Error accessing display media.', error);
                });

            btnRecordScreen.innerHTML = 'Stop Recording';
        });
    })
    .catch(error => {
        console.error('Error accessing media devices.', error);
    });

// send the given action and message
// over the websocket connection
function sendSignal(action, message){
    webSocket.send(
        JSON.stringify(
            {
                'peer': username,
                'action': action,
                'message': message,
            }
        )
    )
}

function onIceCandidate(iceCandidate, peerUsername, receiver_channel_name, localScreenSharing, remoteScreenSharing) {
    // candidate == null indicates that gathering is complete
    if(!iceCandidate){
        console.log("All ICE candidates are sent for %s", peerUsername);
        return;
    }

    console.log('Sending ICE candidate to ', peerUsername, '.');

    // send offer to new peer
    // after ice candidate gathering is complete
    sendSignal('new-ice-candidate', {
        'candidate': iceCandidate,
        'receiver_channel_name': receiver_channel_name,
        'local_screen_sharing': localScreenSharing,
        'remote_screen_sharing': remoteScreenSharing,
    });
}

// create RTCPeerConnection as offerer
// and store it and its datachannel
// send sdp to remote peer after gathering is complete
function createOfferer(peerUsername, localScreenSharing, remoteScreenSharing, receiver_channel_name){
    var peer = new RTCPeerConnection(iceConfiguration);

    // add local user media stream tracks
    addLocalTracks(peer, localScreenSharing);

    // create and manage an RTCDataChannel
    var dc = peer.createDataChannel("channel");
    var newConnectionSound = document.querySelector('#new-connection');
    dc.onopen = () => {
        console.log("Connection opened.");
        newConnectionSound.play();
    };
    var remoteVideo = null;
    if(!localScreenSharing && !remoteScreenSharing){
        // none of the peers are sharing screen (normal operation)
    
        dc.onmessage = dcOnMessage;

        remoteVideo = createVideo(peerUsername);
        setOnTrack(peer, remoteVideo);
        console.log('Remote video source: ', remoteVideo.srcObject);

        // store the RTCPeerConnection
        // and the corresponding RTCDataChannel
        mapPeers[peerUsername] = [peer, dc];

        peer.oniceconnectionstatechange = () => {
            var iceConnectionState = peer.iceConnectionState;
            if (iceConnectionState === "failed" || iceConnectionState === "disconnected" || iceConnectionState === "closed"){
                console.log('Deleting peer');
                delete mapPeers[peerUsername];
                if(iceConnectionState != 'closed'){
                    peer.close();
                }
                removeVideo(remoteVideo);
            }
        };
    }else if(!localScreenSharing && remoteScreenSharing){
        // answerer is screen sharing

        dc.onmessage = (e) => {
            console.log('New message from %s\'s screen: ', peerUsername, e.data);
        };

        remoteVideo = createVideo(peerUsername + '-screen');
        setOnTrack(peer, remoteVideo);
        console.log('Remote video source: ', remoteVideo.srcObject);

        // if offer is not for screen sharing peer
        mapPeers[peerUsername + ' Screen'] = [peer, dc];

        peer.oniceconnectionstatechange = () => {
            var iceConnectionState = peer.iceConnectionState;
            if (iceConnectionState === "failed" || iceConnectionState === "disconnected" || iceConnectionState === "closed"){
                delete mapPeers[peerUsername + ' Screen'];
                if(iceConnectionState != 'closed'){
                    peer.close();
                }
                removeVideo(remoteVideo);
            }
        };
    }else{
        // offerer itself is sharing screen

        dc.onmessage = (e) => {
            console.log('New message from %s: ', peerUsername, e.data);
        };

        mapScreenPeers[peerUsername] = [peer, dc];

        peer.oniceconnectionstatechange = () => {
            var iceConnectionState = peer.iceConnectionState;
            if (iceConnectionState === "failed" || iceConnectionState === "disconnected" || iceConnectionState === "closed"){
                delete mapScreenPeers[peerUsername];
                if(iceConnectionState != 'closed'){
                    peer.close();
                }
            }
        };
    }

    peer.onicecandidate = (event) => onIceCandidate(event.candidate, peerUsername, receiver_channel_name, localScreenSharing, remoteScreenSharing)

    peer.createOffer()
        .then(offer => peer.setLocalDescription(offer))
        .then(() => {
            console.log("Local Description Set successfully.");

            sendSignal('new-offer', {
                'sdp': peer.localDescription,
                'receiver_channel_name': receiver_channel_name,
                'local_screen_sharing': localScreenSharing,
                'remote_screen_sharing': remoteScreenSharing,
            });
        });

    console.log('mapPeers[', peerUsername, ']: ', mapPeers[peerUsername]);

    return peer;
}

// create RTCPeerConnection as answerer
// and store it and its datachannel
// send sdp to remote peer after gathering is complete
function createAnswerer(offer, peerUsername, localScreenSharing, remoteScreenSharing, receiver_channel_name){
    var peer = new RTCPeerConnection(iceConfiguration);

    addLocalTracks(peer, localScreenSharing);

    var newConnectionSound = document.querySelector('#new-connection');

    if(!localScreenSharing && !remoteScreenSharing){
        // if none are sharing screens (normal operation)

        // set remote video
        var remoteVideo = createVideo(peerUsername);

        // and add tracks to remote video
        setOnTrack(peer, remoteVideo);

        // mapPeers[peerUsername] = [peer, null];

        /*
        TODO: Remove data channel dependency
        */
        // it will have an RTCDataChannel
        peer.ondatachannel = e => {
            peer.dc = e.channel;
            peer.dc.onmessage = dcOnMessage;
            peer.dc.onopen = () => {
                console.log("Connection opened.");
                newConnectionSound.play();
            }

            // store the RTCPeerConnection
            // and the corresponding RTCDataChannel
            // after the RTCDataChannel is ready
            // otherwise, peer.dc may be undefined
            // as peer.ondatachannel would not be called yet
            mapPeers[peerUsername] = [peer, peer.dc];
        }

        peer.oniceconnectionstatechange = () => {
            var iceConnectionState = peer.iceConnectionState;
            if (iceConnectionState === "failed" || iceConnectionState === "disconnected" || iceConnectionState === "closed"){
                delete mapPeers[peerUsername];
                if(iceConnectionState != 'closed'){
                    peer.close();
                }
                removeVideo(remoteVideo);
            }
        };
    }else if(localScreenSharing && !remoteScreenSharing){
        // answerer itself is sharing screen

        // it will have an RTCDataChannel
        peer.ondatachannel = e => {
            peer.dc = e.channel;
            peer.dc.onmessage = (evt) => {
                console.log('New message from %s: ', peerUsername, evt.data);
            }
            peer.dc.onopen = () => {
                console.log("Connection opened.");
                newConnectionSound.play();
            }

            // this peer is a screen sharer
            // so its connections will be stored in mapScreenPeers
            // store the RTCPeerConnection
            // and the corresponding RTCDataChannel
            // after the RTCDataChannel is ready
            // otherwise, peer.dc may be undefined
            // as peer.ondatachannel would not be called yet
            mapScreenPeers[peerUsername] = [peer, peer.dc];

            peer.oniceconnectionstatechange = () => {
                var iceConnectionState = peer.iceConnectionState;
                if (iceConnectionState === "failed" || iceConnectionState === "disconnected" || iceConnectionState === "closed"){
                    delete mapScreenPeers[peerUsername];
                    if(iceConnectionState != 'closed'){
                        peer.close();
                    }
                }
            };
        }
    }else{
        // offerer is sharing screen

        // set remote video
        var remoteVideo = createVideo(peerUsername + '-screen');
        // and add tracks to remote video
        setOnTrack(peer, remoteVideo);

        // it will have an RTCDataChannel
        peer.ondatachannel = e => {
            peer.dc = e.channel;
            peer.dc.onmessage = evt => {
                console.log('New message from %s\'s screen: ', peerUsername, evt.data);
            }
            peer.dc.onopen = () => {
                console.log("Connection opened.");
                newConnectionSound.play();
            }

            // store the RTCPeerConnection
            // and the corresponding RTCDataChannel
            // after the RTCDataChannel is ready
            // otherwise, peer.dc may be undefined
            // as peer.ondatachannel would not be called yet
            mapPeers[peerUsername + ' Screen'] = [peer, peer.dc];
            
        }
        peer.oniceconnectionstatechange = () => {
            var iceConnectionState = peer.iceConnectionState;
            if (iceConnectionState === "failed" || iceConnectionState === "disconnected" || iceConnectionState === "closed"){
                delete mapPeers[peerUsername + ' Screen'];
                if(iceConnectionState != 'closed'){
                    peer.close();
                }
                removeVideo(remoteVideo);
            }
        };
    }

    peer.onicecandidate = (event) => onIceCandidate(event.candidate, peerUsername, receiver_channel_name, localScreenSharing, remoteScreenSharing)

    peer.setRemoteDescription(offer)
        .then(() => {
            console.log('Set offer from %s.', peerUsername);
            return peer.createAnswer();
        })
        .then(a => {
            console.log('Setting local answer for %s.', peerUsername);
            return peer.setLocalDescription(a);
        })
        .then(() => {
            console.log('Answer created for %s.', peerUsername);
            // console.log('localDescription: ', peer.localDescription);
            // console.log('remoteDescription: ', peer.remoteDescription);

            sendSignal('new-answer', {
                'sdp': peer.localDescription,
                'receiver_channel_name': receiver_channel_name,
                'local_screen_sharing': localScreenSharing,
                'remote_screen_sharing': remoteScreenSharing,
            });
        })
        .catch(error => {
            console.log('Error creating answer for %s.', peerUsername);
            console.log(error);
        });

    return peer
}

function dcOnMessage(event){
    var message = event.data;
    
    var li = document.createElement("li");
    li.appendChild(document.createTextNode(message));
    ul.appendChild(li);

    var chatSound = document.querySelector('#chat-sound');
    chatSound.play();
}

// get all stored data channels
function getDataChannels(){
    var dataChannels = [];
    
    for(peerUsername in mapPeers){
        console.log('mapPeers[', peerUsername, ']: ', mapPeers[peerUsername]);
        var dataChannel = mapPeers[peerUsername][1];
        console.log('dataChannel: ', dataChannel);

        dataChannels.push(dataChannel);
    }

    return dataChannels;
}

// get all stored RTCPeerConnections
// peerStorageObj is an object (either mapPeers or mapScreenPeers)
function getPeers(peerStorageObj){
    var peers = [];
    
    for(peerUsername in peerStorageObj){
        var peer = peerStorageObj[peerUsername][0];
        console.log('peer: ', peer);

        peers.push(peer);
    }

    return peers;
}

// for every new peer
// create a new video element
// and its corresponding user gesture button
// assign ids corresponding to the username of the remote peer
function createVideo(peerUsername){
    var videoContainer = document.querySelector('#video-container');

    // create the new video element
    // and corresponding user gesture button
    var remoteVideo = document.createElement('video');
    // var btnPlayRemoteVideo = document.createElement('button');

    remoteVideo.id = peerUsername + '-video';
    remoteVideo.autoplay = true;
    remoteVideo.playsinline = true;
    // btnPlayRemoteVideo.id = peerUsername + '-btn-play-remote-video';
    // btnPlayRemoteVideo.innerHTML = 'Click here if remote video does not play';

    // wrapper for the video and button elements
    var videoWrapper = document.createElement('div');

    // add the wrapper to the video container
    videoContainer.appendChild(videoWrapper);

    // add the video and button to the wrapper
    videoWrapper.appendChild(remoteVideo);
    // videoWrapper.appendChild(btnPlayRemoteVideo);

    // as user gesture
    // video is played by button press
    // otherwise, some browsers might block video
    // btnPlayRemoteVideo.addEventListener("click", function (){
    //     remoteVideo.play();
    //     btnPlayRemoteVideo.style.visibility = 'hidden';
    // });

    return remoteVideo;
}

// set onTrack for RTCPeerConnection
// to add remote tracks to remote stream
// to show video through corresponding remote video element
function setOnTrack(peer, remoteVideo){
    console.log('Setting ontrack:');
    // create new MediaStream for remote tracks
    var remoteStream = new MediaStream();

    // assign remoteStream as the source for remoteVideo
    remoteVideo.srcObject = remoteStream;

    console.log('remoteVideo: ', remoteVideo.id);

    peer.addEventListener('track', async (event) => {
        console.log('Adding track: ', event.track);
        remoteStream.addTrack(event.track, remoteStream);
    });
}

// called to add appropriate tracks
// to peer
function addLocalTracks(peer, localScreenSharing){
    if(!localScreenSharing){
        // if it is not a screen sharing peer
        // add user media tracks
        localStream.getTracks().forEach(track => {
            console.log('Adding localStream tracks.');
            peer.addTrack(track, localStream);
        });

        return;
    }

    // if it is a screen sharing peer
    // add display media tracks
    localDisplayStream.getTracks().forEach(track => {
        console.log('Adding localDisplayStream tracks.');
        peer.addTrack(track, localDisplayStream);
    });
}

function removeVideo(video){
    // get the video wrapper
    var videoWrapper = video.parentNode;
    // remove it
    videoWrapper.parentNode.removeChild(videoWrapper);
}

function addIceCandidateToPeer(rtcIceCandidate, peer) {
    peer.addIceCandidate(rtcIceCandidate).catch((e) => {
        console.error('Error adding received ice candidate: ', e);
    })
}

function handleNewIceCandidateFromRemotePeer(candidate, peerUsername) {
    const rtcIceCandidate = new RTCIceCandidate(candidate);

    const mappedPeer = mapPeers[peerUsername];
    if(!mappedPeer){
        console.log('Skipped ICE candidate because stored peer connection was not found');
        return;
    }

    console.log('Adding ICE candidate to peer connection');

    const peer = mappedPeer[0];

    addIceCandidateToPeer(rtcIceCandidate, peer);
}