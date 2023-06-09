using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data.Models
{
    public class CookieControlDefinition
    {
        public int Id { get; set; }
        public string ProductName { get; set; }
        public string ProductKey { get; set; }
        public DateTime DateModified { get; set; }
        public bool Enabled { get; set; }
    }
}
