const net = require('net');
const admin = require('firebase-admin'); 
const axios = require('axios');
const PORT = 8002;
const API_URL = 'https://endpoint.com';
const FIREBASE_DATABASE_URL = 'https://FIREBASE_DATABASE_URL.firebasedatabase.app';
const CommandEnums = require('./enums/commandEnums');
const ExternalLockStatusEnums = require('./enums/externalLockStatusEnums');
const ExternalLockOperationEnums = require('./enums/externalLockOperationEnums');

const serviceAccount = require('./.firebase-file.json');

const clientSockets = [];
const clientSocketsImei = [];
const imeiSocketMap = new Map();   
var counter = 0 ; 
var counterV2 = 0 ; 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: FIREBASE_DATABASE_URL
});

const db = admin.firestore();


function sendToAllClients(data) {
  const buffer = MakeCMD(data);
  for (const socket of clientSockets) {
    socket.write(buffer);
  }
}
 

function sendCommandToIMEI(imei, command) {
  const socketImei = imeiSocketMap.get(imei);
  
  if (!socketImei) {
      console.error(`No socket found for IMEI: ${imei}`);
      sendV1Update(imei, command ,"IOTDevices","sendCommandToIMEI_NoImei")
      return;
  }

  if (socketImei.destroyed) {
      console.error(`Socket for IMEI: ${imei} is destroyed.`); 
      sendV1Update(imei, command ,"IOTDevices","sendCommandToIMEI/", "Destroyed" ) 
      return;
  }
  
  try {
    var sctimei = socketImei.write(MakeCMD(command)); 
    sendV1Update(counterV2, `${command}::${sctimei}`  ,"IOTDevices","sendCommandToIMEISend/", `${imei}` ) 
  } catch (error) {
      console.error(`Error while sending command to IMEI: ${imei}. Error: ${error.message}`);
      command += " " + error.message 
      sendV1Update(imei, command ,"IOTDevices","sendCommandToIMEI/", "Error" ) 
      return;
  }
}




const MakeCMD = (command) => {
  return Buffer.from(`${command}#`);
};

async function sendV1Update(id, data, dname = 'Scooters', parentId = "---", parentId2 = "") {
  try {
    const update = {};
    update[`/${dname}/${parentId}${parentId2}/${id}`] = data;
    await admin.database().ref().update(update);
    console.log("___ sendTestUpdate");
  } catch (e) {
    console.log("HATA=== sendTestUpdate", e);
  }
}

async function sendAPIdeviceStatus(jsonData, dataString) {
  try {
    const url = `${API_URL}/callback/Lock${dataString}`
    const config = {
      method: 'get',
      url:  url ,
      headers: {}
    };

    const response = await axios(config);
    console.log("Api ye bildirdim" , response.data);
    console.log("Api url" , url);
  } catch (error) {
    console.log("HATA=== sendAPIdeviceStatus", error);
  }
}

async function sendAPIdeviceStatusLock(jsonData, dataString) {
  try {
    const url = `${API_URL}/callback/Lock${dataString}`
    const config = {
      method: 'get',
      url:  url ,
      headers: {}
    };

    const response = await axios(config);
    console.log("Api ye bildirdim" , response.data);
    console.log("Api url" , url);
  } catch (error) {
    console.log("HATA=== sendAPIdeviceStatus", error);
  }
}

const server = net.createServer();

server.on('connection', (socket) => {
  const remoteAddress = `${socket.remoteAddress},${socket.remotePort}`;
  clientSockets.push(socket);
  let imei;
  let gelenIstemciArray;
  let requestedOperation ; 
  let route ; 

  console.log(remoteAddress);
  console.log(`BAGLANDI is established... ${Date.now()} \n `);

  socket.on('data', async function (payload) {
    // const timestamp = Date.now();
    const timestamp = Math.floor(Date.now() / 1000) ; 
    
    const gelenIstemci = payload.toString() ; 
    //console.log("payload from client",payload)
    console.log("payload from client",gelenIstemci)
     gelenIstemciArray = gelenIstemci.split(",") ; 

    
    route = gelenIstemciArray[0];
    imei = gelenIstemciArray[2]; 
    let inst = ( gelenIstemciArray[3] != "undefined"  ? gelenIstemciArray[3] : -1 ); 
    inst = inst.replace('#','')
    inst = inst.trim() 
    const oper = (typeof gelenIstemciArray[4] !== "undefined" && gelenIstemciArray[4] !== null ? gelenIstemciArray[4].replace('#','').trim() : -1); 
    const externalLockStatus = (typeof gelenIstemciArray[5] !== "undefined" && gelenIstemciArray[5] !== null ? gelenIstemciArray[5].replace('#','').trim() : -1);

    let key;
    var userId = 10234;

    if (imei && !imeiSocketMap.has(imei) &&  route == "*SCOR"  ) {
      imeiSocketMap.set(imei, socket);
      clientSocketsImei.push( imei ) ;

      /*
        Setting all scooters as follows
        Accelerometer sensitivity : middle
        Unlock status info upload : On
        Heartbeat upload interval : 240s
        Unlock status info uploading interval : 10s
      */
      instruction0 = `*SCOS,OM,${imei},S5,2,2,240,480#\n`;  
      // socket.write(MakeCMD("\n")); 
      sendCommandToIMEI(imei, instruction0);

    } 
    console.log ( "-" );  
    console.log ( inst ); 
    // socket.write(MakeCMD("\n"));  
    if ( inst != CommandEnums.CHECK_IN && inst != CommandEnums.HEARTBEAT ) {
      sendV1Update(imei, gelenIstemciArray ,"IOTDevices","lastdata")
    }  

    // if ( route == "*RAKS" ) {
      if ( route === "*SCOS" ) {
      var instruction0 = "";
      if ( !imeiSocketMap.has(imei)   ) {
        sendAPIdeviceStatusLock(null , `?Imei=${imei}&Status=StatusLock&ExternalLockStatus=-3&Oper=-3`) 
        return false ; 
      }

      if ( inst === CommandEnums.UNLOCKING_LOCK ) { // if (inst === 'R0') {
        console.log('R0 cmd from scooter:', imei);
        key = gelenIstemciArray[5];   
       // R0 , L0, L5 
        requestedOperation = gelenIstemciArray[4]; // Requested operation 0->Unlock operation 1->Lock operation  
        instruction0 = `*SCOS,OM,${imei},R0,${ requestedOperation },20,${userId},${timestamp}#\n`;  
        // socket.write(MakeCMD("\n")); 
        sendCommandToIMEI(imei, instruction0);
        console.log('R0 send packet Server -> Lock:' , instruction0 );   
        sendV1Update(imei, gelenIstemciArray ,"IOTDevices","Step1-Start")  
      }
      if ( inst === CommandEnums.UNLOCK ) { 
        requestedOperation = gelenIstemciArray[4]; // Requested operation  0->Success 1->Failure 2->KEY Error or Failure  
          sendV1Update(imei, gelenIstemciArray ,"IOTDevices","UNLOCK") 
          instruction0 = `*SCOS,OM,${imei},L0,${operationKey},${userId},${timestamp}#\n`;   
          // socket.write(MakeCMD("\n")); 
          sendCommandToIMEI(imei, instruction0)
          console.log('L0 send packet Server -> Lock:' );    
       }
      if (inst ===  CommandEnums.UNLOCK_EXTERNAL_DEVICES ) { // // if (inst === 'L5') {
        console.log('L5 route  :', route );   

        //var instruction0 = `*SCOS,OM,${imei},L5,3#\n`;  
        instruction0 = `*SCOS,OM,${imei},L5,${oper}#\n`;  
        // socket.write(MakeCMD("\n"));
        //sendToAllClients(instruction0)
        gelenIstemciArray.push( instruction0 )
        sendV1Update(imei, gelenIstemciArray ,"IOTDevices","RequestforLockOpen") 
        sendCommandToIMEI(imei, instruction0)
        console.log('L5 send packet Server -> Lock:' , oper );   

      }         
      if (inst ===  CommandEnums.GET_POSITIONING_INSTRUCTION_ST ) {
        console.log('D0 status: Cihazın lokasyon durumunu bildiriyor. ', externalLockStatus, imei, gelenIstemci , timestamp);    
        instruction0 = `*SCOS,OM,${imei},D0#\n`;   
        sendCommandToIMEI(imei, instruction0)
        console.log('D0 send packet Server -> Lock:' );   
      }

      if (inst ===  CommandEnums.EVENT_NOTIFICATION ) { // Eventnotificationcommand 
          instruction0 = `*SCOS,OM,${imei},S1,${oper}#\n`;   
          sendCommandToIMEI(imei, instruction0)
          console.log('S1 send packet Server -> Lock:' , instruction0 );  
          sendV1Update(imei, gelenIstemciArray ,"IOTDevices","S1Send")   
      } 

      if (inst === CommandEnums.GET_DEVICE_INFO ) {  // inst ===  CommandEnums.GET_DEVICE_INFO ||
        console.log('S6 route' , route );    
          instruction0 = `*SCOS,OM,${imei},S6#\n`;   
          sendCommandToIMEI(imei, instruction0)
          console.log('S6 send packet Server -> Lock:' );    
       }

       if ( inst === CommandEnums.GET_FW_VERSION ) { // if (inst === 'G0') {
          console.log('G0 cmd from scooter:', imei);
          key = gelenIstemciArray[5];  
          requestedOperation = gelenIstemciArray[4]; // Requested operation 0->Unlock operation 1->Lock operation 
          instruction0 = `*SCOS,OM,${imei},G0#\n`;  
          // socket.write(MakeCMD("\n")); 
          sendCommandToIMEI(imei, instruction0)
          console.log('G0 send packet Server -> Lock:' );   
      }

      if ( inst === CommandEnums.GET_UPGRADE_DATA ) { // if (inst === 'U1') {
        console.log('U1 cmd from scooter:', imei);
        key = gelenIstemciArray[5]; 
        /// YENI TEST  
        requestedOperation = gelenIstemciArray[4]; // Requested operation 0->Unlock operation 1->Lock operation 
        instruction0 = `*SCOS,OM,${imei},U1,${requestedOperation},${externalLockStatus}#\n`;   
        sendCommandToIMEI(imei, instruction0)
        console.log('U1 send packet Server -> Lock:' );  
        sendV1Update(imei, instruction0 ,"IOTDevices","SET_FW_1" );   
      }  
    } else if ( route === "*SCOR" ) {

      if ( inst === CommandEnums.UNLOCKING_LOCK ) { // if (inst === 'R0') {
        console.log('R0 cmd from scooter:', imei);
        key = gelenIstemciArray[5]; 

        requestedOperation = gelenIstemciArray[4]; // Requested operation 0->Unlock operation 1->Lock operation  
        console.log('R0 send packet Lock -> Server:' , requestedOperation);  
        if ( requestedOperation == 0 ) {   // UNLOCK
          sendV1Update(imei, gelenIstemciArray ,"IOTDevices","Step2-Start_1Response_R0" ); 

          var operationKey = gelenIstemciArray[5] ; 
          var instruction0 = `*SCOS,OM,${imei},L0,${operationKey},${userId},${timestamp}#\n`;   
          gelenIstemciArray.push( instruction0  ) 
          // socket.write(MakeCMD("\n")); 
          sendCommandToIMEI(imei, instruction0)
          console.log('L0 send packet Server -> Lock:' );   
          sendV1Update(imei, gelenIstemciArray ,"IOTDevices","Step2-Start_2DevicesOPEN_L0" );  

        } else if ( requestedOperation == 1 ) {   // LOCK 
          sendV1Update(imei, gelenIstemciArray ,"IOTDevices","End_1Response_R0" ); 
          var operationKey = gelenIstemciArray[5] ; 
          var instruction0 = `*SCOS,OM,${imei},L1,${operationKey}#\n`;  
          // socket.write(MakeCMD("\n")); 
          sendCommandToIMEI(imei, instruction0)
          console.log('L1 send packet Server -> Lock:' );   
            sendV1Update(imei, instruction0 ,"IOTDevices", "End_2DevicesLOCK_L1" );  
        }  
       /// YENI TEST END  

      } 
      if ( inst === CommandEnums.UNLOCK ) { 
          requestedOperation = gelenIstemciArray[4]; // Requested operation  0->Success 1->Failure 2->KEY Error or Failure  
          sendV1Update(imei, gelenIstemciArray ,"IOTDevices","Step3-Start_1Response_L0" );  
          console.log('L0 send packet Lock -> Server:' , requestedOperation);  
          if ( requestedOperation == 0 ) {  
            // userId = gelenIstemciArray[5] ;  
            // userId = parseInt(userId) ; 
            //
            if ( userId != 0 ) { 
              var instruction0 = `*SCOS,OM,${imei},L5,3#\n`;  
              // socket.write(MakeCMD("\n")); 
              sendCommandToIMEI(imei, instruction0)
              console.log('L5 send packet Server -> Lock:' );   
              instruction0 += `timestamp,${timestamp} `
              instruction0 += `,userId,${userId} `
                sendV1Update(imei, instruction0 ,"IOTDevices", "Step3-Start_2LockOPEN_L5" );  
            }

            instruction0 = `*SCOS,OM,${imei},L0#\n`;   
            sendCommandToIMEI(imei, instruction0)   
              //
          } else {  
            sendAPIdeviceStatusLock(null , `?Imei=${imei}&Status=StatusLock&ExternalLockStatus=-2&Oper=${requestedOperation}`)
  
            // requestedOperation = 1 ; // Requested operation 0->Unlock operation 1->Lock operation 
            // var instruction0 = `*SCOS,OM,${imei},R0,${requestedOperation},20,${userId},${timestamp}#\n`;  
            var instruction0 = `*SCOS,OM,${imei},S1,2#\n`;  
            socket.write(MakeCMD("\n")); 
            sendCommandToIMEI(imei, instruction0)
            console.log('S1 send packet Server -> Lock:' );  
  
          } 
       }
       if (inst ===  CommandEnums.UNLOCK_EXTERNAL_DEVICES ) { // // if (inst === 'L5') {  
        // hatalı ise tekrar kilit açma gönderilecek  
          console.log('L5 status Lock -> Server :', externalLockStatus, imei, gelenIstemci , timestamp);  
          console.log('L5 status Lock   : externalLockStatus == ', externalLockStatus  , "Success => " , ExternalLockStatusEnums.Success );   
          requestedOperation = gelenIstemciArray[4]; // Requested operation 0->Unlock operation 1->Lock operation
          requestedOperation = parseInt(requestedOperation);


          if ( 
            requestedOperation === ExternalLockOperationEnums.UnlockHelmetLock 
            || requestedOperation === ExternalLockOperationEnums.UnlockCableLock   
            
            ) {

              if ( externalLockStatus == ExternalLockStatusEnums.Success ) {
                // kilit açıldı ve kullanıma hazır ,  
                    var jsonData = JSON.stringify({
                      "Imei": imei,
                      "Status": externalLockStatus
                    }); 
                    sendAPIdeviceStatus(null , `?Imei=${imei}&Status=${externalLockStatus}&Oper=${oper}`)
                    sendV1Update(imei, gelenIstemciArray ,"IOTDevices","Step4-UNLOCK") 
    
              }else if ( externalLockStatus == ExternalLockStatusEnums.Failure 
                || externalLockStatus == ExternalLockStatusEnums.CommunicationtimeOutWithE ) { 
                    sendAPIdeviceStatusLock(null , `?Imei=${imei}&Status=StatusLock&ExternalLockStatus=${externalLockStatus}&Oper=${oper}`)
                  console.log('you shoult ->> L5 re-send packet Server -> Lock:' );  
                  sendV1Update(imei, gelenIstemciArray ,"IOTDevices","Step4-HATA_ReSend_kilitAçılamadı" )
              }

            }  else if (
              requestedOperation === ExternalLockOperationEnums.LockhelmetLock 
            || requestedOperation === ExternalLockOperationEnums.LockCableLock  

            ) {

            // kilitli ,  
            // status e göre yapılması gerekiyor . 
            // if ( externalLockStatus ) 
              console.log('L5 status: Cihazın kilit durumunu bildiriyor. ', externalLockStatus, imei, gelenIstemci , timestamp);  
              var suan = new Date(  );
              gelenIstemciArray.push( suan.toISOString()  )
              sendV1Update(imei, gelenIstemciArray ,"IOTDevices","Step9-TeslimEdilen") 
              sendAPIdeviceStatus(null , `?Imei=${imei}&Status=1`)
              var instruction0 = `*SCOS,OM,${imei},R0,1,20,${userId},${timestamp}#\n`;  
              // socket.write(MakeCMD("\n")); 
              sendCommandToIMEI(imei, instruction0)
              console.log('R0 send packet Server -> Lock:' );    
            }else if (
              
              requestedOperation === ExternalLockOperationEnums.LockBatteryLock  

            ) {

              sendAPIdeviceStatusLock(null , `?Imei=${imei}&Status=StatusLock&ExternalLockStatus=${externalLockStatus}&Oper=${oper}`)
              sendV1Update(imei, gelenIstemciArray ,"IOTDevices","HATA_LockBatteryLock" )

            } else {
              var suan = new Date(  );
              gelenIstemciArray.push( suan.toISOString()  )
              sendV1Update(imei, gelenIstemciArray ,"IOTDevices","Tanimsiz")
            } 
            gelenIstemciArray.push({ "requestedOperation": requestedOperation });
            gelenIstemciArray.push({ "externalLockStatus": externalLockStatus }); 
            sendV1Update(imei, gelenIstemciArray ,"IOTDevices","Step8_UNLOCK_EXTERNAL_DEVICES")  

      } 
      if ( inst === CommandEnums.LOCK ) { // L1
        requestedOperation = gelenIstemciArray[4]; // Requested operation  0->Success 1->Failure 2->KEY Error or Failure   
        if ( requestedOperation == 0 ) {  
          instruction0 = `*SCOS,OM,${imei},L1#\n`;   
          sendCommandToIMEI(imei, instruction0)   
        }  

      }
      if (inst ===  CommandEnums.GET_POSITIONING_INSTRUCTION_ST ) {
        console.log('D0 status: Cihazın lokasyon durumunu bildiriyor. ', externalLockStatus, imei, gelenIstemci , timestamp);  
        var suan = new Date(  );
        gelenIstemciArray.push( suan.toISOString()  ) 
        sendV1Update(imei, gelenIstemciArray ,"Ormanya_Lokasyon")  
        var lat = gelenIstemciArray[7];  
        var long = gelenIstemciArray[9];   
        if ( lat.length > 0 && long.length > 0 ){
          sendAPIdeviceStatus(null , `?Imei=${imei}&Status=Lokasyon&Lat=${lat}&Long=${long}`)
        } 
        
      } 
      if (inst ===  CommandEnums.EVENT_NOTIFICATION ) { // Eventnotificationcommand 
          sendV1Update(imei, gelenIstemciArray ,"IOTDevices","S1")  
      }  
      if (inst === CommandEnums.GET_DEVICE_INFO ) {  // inst ===  CommandEnums.GET_DEVICE_INFO ||
            console.log('S6 route' , route );   
            console.log('S6 status Lock -> Server :',  imei, gelenIstemci);   
            var suan = new Date(  );
            gelenIstemciArray.push( suan.toISOString()  )
            sendV1Update(imei, gelenIstemciArray ,"Ormanya_CihazBilgisi") 
       } 
       if ( inst === CommandEnums.GET_FW_VERSION ) { // if (inst === 'G0') {
          console.log('G0 cmd from scooter:', imei);
          key = gelenIstemciArray[5];  
          requestedOperation = gelenIstemciArray[4]; // Requested operation 0->Unlock operation 1->Lock operation 
          var softwareVersion = gelenIstemciArray[4];  
          var sCompilationDate = gelenIstemciArray[5];  
          var pCBVersionNum = gelenIstemciArray[6];  

          sendV1Update(imei, gelenIstemciArray ,"IOTDevices","GET_FW" ); 
          sendAPIdeviceStatus(null , `?Imei=${imei}&Status=FWUpdate&SoftwareVersion=${softwareVersion}&SCompilationDate=${sCompilationDate}&PCBVersionNum=${pCBVersionNum}`)
          console.log('G0 send packet Lock -> Server:' , requestedOperation);     
      } 
      if ( inst === CommandEnums.GET_UPGRADE_DATA ) { // if (inst === 'U1') {
          console.log('U1 cmd from scooter:', imei);
          key = gelenIstemciArray[5];  
          requestedOperation = gelenIstemciArray[4]; // Requested operation 0->Unlock operation 1->Lock operation 
          sendV1Update(imei, gelenIstemciArray ,"IOTDevices","SET_FW" ); 
          //sendAPIdeviceStatus(null , `?Imei=${imei}&Status=FWUpdate&SoftwareVersion=${softwareVersion}&SCompilationDate=${sCompilationDate}&PCBVersionNum=${pCBVersionNum}`)
          console.log('U1 send packet Lock -> Server:' , requestedOperation);     
      } 
      if ( inst === CommandEnums.NOTIFICATION_OF_UPGRADE_SUCCESSFULLY ) { // if (inst === 'U2') { 
       requestedOperation = gelenIstemciArray[4]; // Requested operation 0->Unlock operation 1->Lock operation
       sendV1Update(imei, gelenIstemciArray ,"IOTDevices","SET_FW_SUCCESSFULL" ); 
       //sendAPIdeviceStatus(null , `?Imei=${imei}&Status=FWUpdate&SoftwareVersion=${softwareVersion}&SCompilationDate=${sCompilationDate}&PCBVersionNum=${pCBVersionNum}`)
       console.log('U2 send packet Lock -> Server:' , requestedOperation);     
       if ( externalLockStatus == ExternalLockStatusEnums.Success ) {  
        var instruction0 = `*SCOS,OM,${imei},G0#\n`;  
        // socket.write(MakeCMD("\n")); 
        sendCommandToIMEI(imei, instruction0)
        console.log('G0 send packet Server -> Lock:' );   
       } else { 
        sendV1Update(imei, gelenIstemciArray ,"IOTDevices","SET_FW_SUCCESSFULL_BASARISIZ" ); 
       } 
      } 
      if ( inst === CommandEnums.ALARM ) { 
        requestedOperation = gelenIstemciArray[4]; // Requested operation  0->Success 1->Failure 2->KEY Error or Failure 
        sendV1Update(imei, gelenIstemciArray ,"IOTDevices","W0-Alarm" );   
       } 
      if (inst === CommandEnums.CHECK_IN || inst === CommandEnums.HEARTBEAT ) {
        console.log('Connecting request from scooter:', imei, timestamp);  
        console.log("------------HQ",imei);
        var suan = new Date(  );
        gelenIstemciArray.push( suan.toISOString()  ) 
        var batteryLevel = gelenIstemciArray[7]; // 
        var gSMSignal = gelenIstemciArray[6]; //  
        sendAPIdeviceStatus(null , `?Imei=${imei}&Status=Heatbeat&BatteryLevel=${batteryLevel}&GSMSignal=${gSMSignal}`) 
      } 
      sendV1Update(counterV2, gelenIstemci ,"IOTDevices","All/", `${imei}` )   
      socket.write(MakeCMD("\n")); 
    } else {
      sendV1Update(`${imei}`, gelenIstemci ,"IOTDevices", route ) 
    } 
    counterV2++ ;   
});

  socket.on('close', () => {

    try { 

    console.log('Server Connection Closed'); 
    const index = clientSockets.indexOf(socket);
    if (index !== -1) {
      clientSockets.splice(index, 1);
    }

    const index2 = clientSocketsImei.indexOf(imei);
    if (index2 !== -1 &&  route == "*SCOR" ) {
      clientSocketsImei.splice(index2, 1);
    }
 
    if (imei && !imeiSocketMap.has(imei) &&  route == "*SCOR"  ) {
      imeiSocketMap.delete(imei);
    }

  } catch (error) {
    var flushData = []; 
    flushData.push( error )
    flushData.push( error.message ) 
    sendV1Update(imei, flushData ,"IOTDevices","x_SocketClose " ) 
}

  });

  socket.on('error', (err) => {
    console.log("Caught flash policy server socket error:");
    console.log(err.stack);
    var flushData = []; 
    flushData.push( err )
    flushData.push( err.stack )
    flushData.push ( gelenIstemciArray );
    flushData.push ( clientSocketsImei );
    
    
    sendV1Update(imei, flushData ,"IOTDevices","x_SocketError" )
    sendAPIdeviceStatusLock(null , `?Imei=${imei}&Status=StatusLock&ExternalLockStatus=-1&Oper=-1&errStack=${err.stack}`)

  });
});


server.listen( PORT, () => {
  console.log('Server Listening on Port ', PORT);
});