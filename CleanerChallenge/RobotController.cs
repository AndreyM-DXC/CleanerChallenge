using Microsoft.AspNetCore.Mvc;

namespace CleanerChallenge
{
    [ApiController]
    [Route("api")]
    public class RobotController : ControllerBase
    {
        private readonly Random random = new Random();

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
