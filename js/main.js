/**
 * Create By Nical @ 20190525
 * NetEase Crop.
 */

var targetAccid;
var isLogined = false;      // is nim logined
var isCalling = false;      // is in netcall
var isLocalAudioMuted = false;
var isRemoteAudioMuted = false;

var containerRemote;        // Remote video container
var acceptDiv;              // accept div
var callerInfoDiv;          // show caller info

var callerIcon;
var callerID;               // to show the info of user
var currentCallType;        // current call type
var currentCid = 0;         // current channel id
var hasNotified = false;    // be call notified
var beCalledInfo = null;    // be call information

var calleeBtn;
var hangupBtnCall;          // hangup Button when calling
var hangupBtnBeCalled;      // hangup Button be called
var microMuteBtn;           // mute forward voice stream
var speakerMuteBtn;         // mute receiving voice stream

var Netcall = WebRTC;       // WebRTC instance from SDK
var netcall;                // WebRTC instance initialized

/**
 * Window UI Bridge
 */
window.onload = function () {

    // httpPost();
    var targetAccidEdt = document.getElementById('targetAccid');
    var startCallBtn = document.getElementById('startCall');
    var logoutBtn = document.getElementById('logoutBtn');
    //divs
    callerInfoDiv = document.getElementById('callerInfoDiv');
    containerRemote = document.getElementById('containerRemote');
    acceptDiv = document.getElementById('mainwrapper1');
    //UserInfo Toast
    callerIcon = document.getElementById('callerIcon');
    callerID = document.getElementById('callerID');
    //buttons
    calleeBtn = document.getElementById('calleeBtn');
    hangupBtnCall = document.getElementById('hangupbtnCall');
    hangupBtnBeCalled = document.getElementById('hangupbtnbeCalled');
    microMuteBtn = document.getElementById('microMute');
    speakerMuteBtn = document.getElementById('speakerMute');

    /***************************** Button Click Event *******************************/
    microMuteBtn.onclick = function() {

        if (isCalling){
            if (isLocalAudioMuted){
                netcall.startDevice({
                    type: Netcall.DEVICE_TYPE_AUDIO_IN,
                    enableEchoCancellation: false,
                    device: {deviceId: ''}
                }).then(function() {
                    console.log('启动麦克风成功');
                }).catch(function(err) {
                    console.log('启动麦克风失败', err);
                });
                microMuteBtn.src = 'res/microMute1.png';
                isLocalAudioMuted = false;
            }else {
                netcall.stopDevice(Netcall.DEVICE_TYPE_AUDIO_IN).then(function() {
                    console.log('麦克风关闭成功')
                });
                microMuteBtn.src = 'res/microMute2.png';
                isLocalAudioMuted = true;
            }
        }

    };
    speakerMuteBtn.onclick = function() {
        if (isCalling){
            if (isRemoteAudioMuted){
                netcall.setAudioStart(targetAccid);
                speakerMuteBtn.src = 'res/speakerMute1.png';
                isRemoteAudioMuted = false;
            } else {
                netcall.setAudioBlack(targetAccid);
                speakerMuteBtn.src = 'res/speakerMute2.png';
                isRemoteAudioMuted = true;
            }
        }
    };
    startCallBtn.onclick = function () {                                        //Start calling button action
        targetAccid = targetAccidEdt.value;
        if (!targetAccid){
            alert('Please input target accid!');
        }else if (!isLogined){
            alert('Please Login first!');
        } else {
            initWebRTC();
            forwardCall(targetAccid);                                           //Main Enterance of WebRTC
        }
    };
    logoutBtn.onclick = function () {                                           //Logout action
        jumpBack();
    };
    hangupBtnCall.onclick = function () {                                       //Calling hangup button at middle
        hangupAndClear();
    };
    calleeBtn.onclick = function () {                                           //accept call request
        netcall.response({
                accepted: true,
                beCalledInfo: beCalledInfo,
                sessionConfig: sessionConfig
        }).catch(function(err) {
                hangupAndClear();
                console.log('Callee exception', err);
        });
    };
    hangupBtnBeCalled.onclick = function () {                                   //reject call request
        netcall.control({
            channelId: beCalledInfo.channelId,
            command: WebRTC.NETCALL_CONTROL_COMMAND_BUSY
        });
        netcall.response({
            accepted: false,
            beCalledInfo
        });
        hangupAndClear();
    };
};

/***************************** NIM *******************************/

var nim = SDK.NIM.getInstance({
    debug: true,
    db:true,
    appKey: '45c6af3c98409b18a84451215d0bdd6e',
    account: readCookie('accid'),
    token: readCookie('token'),
    onconnect: onConnect(readCookie('accid')),
    onwillreconnect: onWillReconnect,
    ondisconnect: onDisconnect,
    onerror: onError,
    onmsg:onMsg
});

function onMsg(msg) {
    console.log("收到消息", msg);
}


function onConnect(accid) {
    isLogined = true;
    console.log('Connection Established');
    document.getElementById('log').value += 'Login Success '+accid+'\n';

}
function onWillReconnect(obj) {
    console.log('Will Reconnect ' + obj.retryCount +' ' + obj.duration );
}
function onDisconnect(error) {

    console.log('Lost Connection');
    console.log(error);
    if (error) {
        switch (error.code) {

            case 302: alert('Invalid account or password');
                jumpBack();
                break;

            case 417: alert('Already login at other terminal');
                jumpBack();
                break;

            case 'kicked': alert('Kicked,Please relogin');
                jumpBack();
                break;
            default: alert('Unknown Reason for disconnection');
                jumpBack();
                break;
        }
    }
}
function onError(error) {
    alert(error);
    window.location.href = './index.html';
    console.log(error);
}

/***************************** WebRTC *******************************/
/**
 * forward calling
 * @param targetAccid
 */
function forwardCall(targetAccid) {
    //TODO webrtc logic
    startCalling(targetAccid);
}
/**
 * init WebRTC by nim
 */
function initWebRTC() {
    SDK.NIM.use(WebRTC);
    console.log(nim);
    const Netcall = WebRTC;
    netcall = Netcall.getInstance({
        nim: nim,
        container: document.getElementById('containerLocal'),
        remoteContainer: document.getElementById('containerRemote'),
        // chromeId: '',                                                        //Screen capture and Sharing
        // debug: true                                                          // Enable debug log print?
    });
    registerObserver();
}
/**
 * Some Observer within calling
 */
function registerObserver() {
    netcall.on('beCalling',function (obj) {                                     // be called callback
        if(isCalling){                                                          // send busy command
            sendControlCommand(Netcall.NETCALL_CONTROL_COMMAND_BUSY,obj.channelId);
            return;
        }
        if (!hasNotified){
            targetAccid = obj.account;
            hasNotified = true;
            currentCallType = obj.type;                                         //store current call type
            showbeCalledUI(obj.account);
            console.log('beCalling',obj);
            currentCid = obj.channelId;
            beCalledInfo = obj;
            isCalling = true;
            document.getElementById('log').value += 'Receive call request from '+beCalledInfo.account+',channelid is '+beCalledInfo.channelId +'\n';
        }
    });
    netcall.on('callRejected', function(obj) {                                  // target reject callback
        console.log('on callRejected', obj);
        document.getElementById('log').value += 'Call ' +obj.channelId + ' is rejected by '+obj.account +'\n';
        hangupAndClear();                                                       // hangup and clean
    });
    netcall.on('callAccepted', function(obj) {                                  // targer accept
        currentCallType = obj.type;
        console.log('on callAccepted', obj);
        document.getElementById('log').value += 'Call ' +obj.channelId + ' is accept by '+obj.account +'\n';
        startRTCConnect();
    });
    netcall.on('hangup', function(obj) {                                        // receive hangup notification
        console.log('on hangup', obj);
        document.getElementById('log').value += 'Call ' +obj.channelId + ' is hangup by '+obj.account +'\n';
        if (currentCid === obj.channelId) {
            hangupAndClear();
        }
    });
    netcall.on('callerAckSync', function(obj) {
        console.log('has accept by other side', obj);
        document.getElementById('log').value += 'Call ' +obj.channelId + ' is already asked by '+obj.account +'\n';
        resetUI();
    });

    netcall.on('streamEnded', function(obj) {
        console.log('媒体流停止了', obj);
        if (obj && obj.type === 'screen') {
            netcall.stopDevice(Netcall.DEVICE_TYPE_DESKTOP_CHROME_SCREEN).then(() => {
                console.log('屏幕共享关闭成功')
            })
        }
    });

    netcall.on('control', function(obj) {
        if (obj.channelId !== currentCid && !isCalling) {
            return;
        }
        if (obj.command){

        }
        switch (obj.command) {
            case Netcall.NETCALL_CONTROL_COMMAND_BUSY : hangupAndClear(); break;
            case Netcall.NETCALL_CONTROL_COMMAND_NOTIFY_AUDIO_ON :{
                document.getElementById('log').value += 'Call ' +obj.channelId + ' participator '+obj.account +' has switch on the audio'+'\n';
            }break;
            case Netcall.NETCALL_CONTROL_COMMAND_NOTIFY_AUDIO_OFF:{
                document.getElementById('log').value += 'Call ' +obj.channelId + ' participator '+obj.account +' has switch off the audio'+'\n';
            }break;
            case Netcall.NETCALL_CONTROL_COMMAND_NOTIFY_VIDEO_ON:;
            case Netcall.NETCALL_CONTROL_COMMAND_NOTIFY_VIDEO_OFF:;
            case Netcall.NETCALL_CONTROL_COMMAND_SWITCH_AUDIO_TO_VIDEO:;
            case Netcall.NETCALL_CONTROL_COMMAND_SWITCH_AUDIO_TO_VIDEO_AGREE:;
            case Netcall.NETCALL_CONTROL_COMMAND_SWITCH_AUDIO_TO_VIDEO_REJECT:;
            case Netcall.NETCALL_CONTROL_COMMAND_SWITCH_VIDEO_TO_AUDIO:;
            case Netcall.NETCALL_CONTROL_COMMAND_SELF_CAMERA_INVALID:;
            case Netcall.NETCALL_CONTROL_COMMAND_SELF_AUDIO_INVALID:;
            case Netcall.NETCALL_CONTROL_COMMAND_NOTIFY_RECORD_START:;
        }
        console.log('on control', obj);

    });

    netcall.on('netStatus',function (obj) {
        console.log(obj);
    });

    netcall.on('audioVolumn', function(obj) {
        console.log('音量', obj);
    })


}

/**
 * Main Action of Calling
 * @param targetAccid
 */
function startCalling(targetAccid) {
    netcall.call({
        type: Netcall.NETCALL_TYPE_VIDEO,
        account: targetAccid,
        pushConfig: pushConfig,
        sessionConfig: sessionConfig,
        webrtcEnable: true
    }).then(function(obj) {
        isCalling = true;                                                       // Forward call Successful
        console.log('call success', obj);
        document.getElementById('log').value += 'Call successful to '+targetAccid +'\n';
        showCallingUI(targetAccid);                                             // Success and show calling UI
    }).catch(function(err) {
        document.getElementById('log').value += 'Call ' + 'has exception of ' +err.event.event.code +'\n';      // 11000 God knows what happened.
        if (err.event.event.code === 11001) {                                         // target offline 11001
            console.log('callee offline', err);
            alert('Target offline');
            hangupAndClear(true);
        }
    });
}
function startRTCConnect() {
    showCallEstablishedUI();                                                    //Established UI process
    netcall.startRtc().then(function() {
        currentCid = netcall.channelId;                                         // Can't UnderStand.
        console.log(currentCid);
        return netcall.startDevice({                                            // Open MicroPhone
            type: Netcall.DEVICE_TYPE_AUDIO_IN
        }).catch(function(err) {
            console.log('Enable Audio Device Failed');
            console.error(err)
        })
    }).then(function() {
            netcall.setCaptureVolume(255);                                      // Set cap vioce vloume
            return netcall.startDevice({                                        // Open camera
                type: Netcall.DEVICE_TYPE_VIDEO
                // type: Netcall.DEVICE_TYPE_DESKTOP_CHROME_SCREEN
            }).catch(function(err) {
                    console.log('Enable Camera Failed');
                    console.error(err)
            })
        }).then(function() {
            netcall.startLocalStream(                                           // Preview Local View
                document.getElementById('containerLocal')
            );
            netcall.setVideoViewSize({                                          // Set Local Preview Size
                width: 90,
                height: 180,
                cut: true
            })
        }).catch(function(err) {
            console.log('startRTCConnect Exception!');
            console.log(err);
            hangupAndClear();
        });

    netcall.on('remoteTrack', function(obj) {                                   // to Show target view
        console.log('user join', obj);
        netcall.startDevice({                                                   // play target audio
            type: Netcall.DEVICE_TYPE_AUDIO_OUT_CHAT
        }).catch(function(err) {
            console.log('Failed to play target audio');
            console.error(err)
        });
        netcall.startRemoteStream({                                             // preview target video
            account: obj.account,
            node: document.getElementById('containerRemote')
        });
        netcall.setVideoViewRemoteSize({                                        // Set target preview size
            account: obj.account,
            width: 360,
            height: 640,
            cut:true
        })
    });

}
/**
 * depose WebRTC and Clear UI
 */
function hangupAndClear(force) {
    if (isCalling || force){
        document.getElementById('log').value += 'You have hang up ' + currentCid + '\n'+'------------Session End--------------' +'\n';
        netcall.hangup();
        isCalling = false;
        currentCallType = null;
        currentCid = 0;
        beCalledInfo = null;
        hasNotified = false;
        isRemoteAudioMuted = false;
        isLocalAudioMuted = false;
        resetUI();
    }
}
/**
 * config of WebRTC
 */
const pushConfig = {
    enable: true,
    needBadge: true,
    needPushNick: true,
    pushContent: 'WebRTC calling',
    custom: 'Test custom data',
    pushPayload: '',
    sound: '',
    forceKeepCalling: 0
};
const sessionConfig = {
    videoQuality: Netcall.CHAT_VIDEO_QUALITY_HIGH,
    videoFrameRate: Netcall.CHAT_VIDEO_FRAME_RATE_15,
    videoBitrate: 0,
    recordVideo: false,
    recordAudio: false,
    highAudio: false,
    bypassRtmp: false,
    rtmpUrl: '',
    rtmpRecord: false,
    splitMode: Netcall.LAYOUT_SPLITLATTICETILE
};
/***************************** Chatting Control *******************************/
function sendControlCommand(i,channelid) {                                            //Send Control command while calling
    if (isCalling){
        const param = {
            channelId: channelid,
            command: i
        };
        netcall.control(param);
    }
}


/***************************** UI Logic *******************************/
/**
 * Jump back to Login Page
 */
function jumpBack() {
    window.location.href = './index.html';
}
/**
 * Calling UI Logic
 */
function showCallingUI(targetAccid) {
    acceptDiv.style.display = 'block';
    callerInfoDiv.style.display = 'block';
    hangupBtnCall.style.display = 'block';
    showUserInfo(targetAccid);
}
function showCallEstablishedUI() {
    callerInfoDiv.style.display = 'none';
    calleeBtn.style.display = 'none';
    hangupBtnBeCalled.style.display = 'none';
    hangupBtnCall.style.display = 'block';
    microMuteBtn.style.display = 'block';
    speakerMuteBtn.style.display = 'block';
}
function showbeCalledUI(targetAccid) {
    calleeBtn.style.display = 'block';
    hangupBtnBeCalled.style.display = 'block';
    callerInfoDiv.style.display = 'block';
    acceptDiv.style.display = 'block';
    showUserInfo(targetAccid);
}
function showUserInfo(targetAccid) {
    nim.getUser({
        account: targetAccid,
        done: getUserDone
    });
}
function getUserDone(error, user) {
    console.log(error);
    console.log(user);
    console.log('获取用户资料' + (!error?'成功':'失败'));
    if (!error) {
        callerID.value = user.nick;
        callerIcon.src = user.avatar;
    }
}
function resetUI() {
    acceptDiv.style.display = 'none';
    callerInfoDiv.style.display = 'none';
    hangupBtnCall.style.display = 'none';
    hangupBtnBeCalled.style.display = 'none';
    calleeBtn.style.display = 'none';
    microMuteBtn.style.display = 'none';
    speakerMuteBtn.style.display = 'none';
    microMuteBtn.src = 'res/microMute1.png';
    speakerMuteBtn.src = 'res/speakerMute1.png';
}

function httpPost() {
    var time = ''+new Date().getTime();
    let forms= new FormData();
    forms.append('type','3');
    forms.append('token',time+MD5(time));
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(){
        if(xhr.readyState===4){
            if(xhr.status>=200&&xhr.status<=300||xhr.status===304){
                console.log(xhr.response);
            }
        }else{
            console.log(xhr.status);
        }
    };
    xhr.open('POST','../../php/hall/demo/hello_demo.php',true);
    xhr.setRequestHeader("Content-Type","application/x-www-form-urlencoded");  //formdata数据请求头需设置为application/x-www-form-urlencoded
    console.log(forms);
    xhr.send(forms);
}