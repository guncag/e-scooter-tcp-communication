
# Omni IoT Device TCP Communication Manager

This project manages the TCP communication with Omni brand IoT devices.

## Getting Started

This section explains how to set up and run the project.

### Prerequisites

- Node.js must be installed.
- You should have a Firebase service account key and it should be added to the project folder.

### Installation

1. Clone the project:

```
git clone git@github.com:guncag/e-scooter-tcp-communication.git
```

2. Install the dependencies:

```
npm install
```

3. Create a `.env` file and add the necessary configurations.

4. Start the application:

```
node index.js
```

 

## Usage

The project listens for TCP requests from Omni devices and responds accordingly. It also synchronizes data with Firebase and sends specific commands back to the devices.

Before using this project, you need to redirect your IoT devices to your server and the port you have specified. With this project, you can send real-time commands to the device connected to the TCP server by making a request to the TCP server.

For example, to start the device and unlock the external lock, you can initiate the process by sending the following command from another project or using tools like "Packet Sender":

```
*SCOS,OM,IMEINUMBER,R0,0,20,1234,16401#\n
```

So:

- **IMEINUMBER**: The IMEI number of the device you want to send the command to.
- **1234**: User ID.
- **16401**: Timestamp, which should be unique each time.

By using the above command format, you can communicate with your IoT devices and manage their operations through this server.

 

## License

This project is licensed under the MIT License. For more details, see the `LICENSE` file.





 
