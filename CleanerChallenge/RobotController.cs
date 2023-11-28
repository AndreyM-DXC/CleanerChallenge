using Microsoft.AspNetCore.Mvc;

namespace CleanerChallenge
{
    [ApiController]
    [Route("api")]
    public class RobotController : ControllerBase
    {
        private static Random random = new Random();

        [HttpGet("reset")]
        public int Reset()
        {
            //TODO Initialization Logic

            random = new Random(2);

            // Random seed for socks will be changed
            return 123;
        }

        [HttpPost("next")]
        public Command Next(State state)
        {
            //TODO Code me!

            return new Command
            {
                x = random.Next(State.Width),
                y = random.Next(State.Height),
            };
        }
    }
}
