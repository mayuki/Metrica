using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.Storage;
using Windows.Foundation;
using Windows.Networking;
using Windows.Networking.Sockets;

namespace MetricaConnectionHelper
{
    public sealed class Connection
    {
        public StreamSocket StreamSocket { get; private set; }

        private String _hostName;
        private Int32 _port;
        private StreamReader _reader;
        private StreamWriter _writer;
        private Encoding _encoding;

        public Connection(String hostName, Int32 port, String encodingName)
        {
            _hostName = hostName;
            _port = port;
            _encoding = (String.Compare(encodingName, "UTF-8", StringComparison.OrdinalIgnoreCase) == 0)
                            ? new System.Text.UTF8Encoding(false)
                            : System.Text.Encoding.GetEncoding(encodingName);
        }

        public IAsyncOperation<String> ReadLineAsync()
        {
            return _reader.ReadLineAsync().AsAsyncOperation();
        }

        public IAsyncAction WriteLineAsync(String line)
        {
            return _writer.WriteLineAsync(line).ContinueWith((t) => _writer.FlushAsync()).AsAsyncAction();
        }

        public IAsyncAction ConnectAsync()
        {
            if (StreamSocket != null)
            {
                throw new InvalidOperationException("Already Connected");
            }

            StreamSocket = new StreamSocket();
            _reader = new StreamReader(StreamSocket.InputStream.AsStreamForRead(5), _encoding);
            _writer = new StreamWriter(StreamSocket.OutputStream.AsStreamForWrite(), _encoding);
            _writer.AutoFlush = true;

            return StreamSocket.ConnectAsync(new HostName(_hostName), _port.ToString());
        }

        public void Disconnect()
        {
            if (StreamSocket == null)
            {
                throw new InvalidOperationException("Connection is not established");
            }

            StreamSocket.Dispose();
            StreamSocket = null;
        }
    }
}
