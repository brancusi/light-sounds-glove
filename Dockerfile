FROM resin/raspberrypi3-node

ENV APP_BASE /usr/src/app
RUN mkdir -p $APP_BASE
WORKDIR $APP_BASE

# Install image tools
RUN apt-get update && apt-get install -y \
  bluetooth bluez bluez-firmware libbluetooth-dev libudev-dev \
  alsa-utils libasound2-dev mpg321 \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY package.json $APP_BASE/

RUN DEBIAN_FRONTEND=noninteractive JOBS=MAX npm install --unsafe-perm

ENV INITSYSTEM on

COPY . $APP_BASE

CMD [ "node", "index.js" ]
