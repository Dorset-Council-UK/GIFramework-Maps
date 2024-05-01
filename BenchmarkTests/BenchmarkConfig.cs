using BenchmarkDotNet.Columns;
using BenchmarkDotNet.Configs;
using BenchmarkDotNet.Order;
using BenchmarkDotNet.Reports;

namespace BenchmarkTests
{
	public class BenchmarkConfig : ManualConfig
	{
		public BenchmarkConfig()
		{
			SummaryStyle = SummaryStyle.Default.WithRatioStyle(RatioStyle.Percentage);
			Orderer = new DefaultOrderer(SummaryOrderPolicy.FastestToSlowest, MethodOrderPolicy.Declared);
		}
	}
}