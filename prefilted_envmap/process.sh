#~/bin/bash
export MSYS_NO_PATHCONV=1
docker run -v /$(pwd)/data:/data -it trigrou/envtools process_environment.py /data/sky.hdr /data/result/