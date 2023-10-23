﻿using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data.Models
{
    public class Category
    {
        public int Id { get; set; }
        [MaxLength(200)]
        public string? Name { get; set; }
        public string? Description { get; set; }
        public int Order { get; set; }
        [Display(Name="Parent Category (optional)")]
        public int? ParentCategoryId { get; set; }
        public List<CategoryLayer> Layers { get; set; } = new();
        public Category? ParentCategory { get; set; }
    }
}
