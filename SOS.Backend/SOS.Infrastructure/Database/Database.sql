use master;

create database SOSMap;
go

---------------------------------------------------------------------------------------------------------------------------------------------
USE [SOSMap]
GO

/****** Object:  Table [dbo].[RescueTasks]    Script Date: 12/10/2025 6:10:08 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[RescueTasks](
	[Id] [uniqueidentifier] NOT NULL,
	[ReportId] [uniqueidentifier] NOT NULL,
	[VolunteerId] [uniqueidentifier] NOT NULL,
	[Status] [nvarchar](20) NOT NULL,
	[Note] [nvarchar](255) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[ReportId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE [dbo].[RescueTasks] ADD  DEFAULT ('accepted') FOR [Status]
GO

ALTER TABLE [dbo].[RescueTasks] ADD  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO

ALTER TABLE [dbo].[RescueTasks] ADD  DEFAULT (sysutcdatetime()) FOR [UpdatedAt]
GO

ALTER TABLE [dbo].[RescueTasks]  WITH CHECK ADD FOREIGN KEY([ReportId])
REFERENCES [dbo].[SOSReports] ([Id])
GO

ALTER TABLE [dbo].[RescueTasks]  WITH CHECK ADD FOREIGN KEY([VolunteerId])
REFERENCES [dbo].[Users] ([Id])
GO

--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

USE [SOSMap]
GO

/****** Object:  Table [dbo].[SafetyPoints]    Script Date: 12/10/2025 6:11:11 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[SafetyPoints](
	[Id] [uniqueidentifier] NOT NULL,
	[Name] [nvarchar](100) NOT NULL,
	[Type] [nvarchar](50) NOT NULL,
	[Address] [nvarchar](255) NULL,
	[Description] [nvarchar](max) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

ALTER TABLE [dbo].[SafetyPoints] ADD  DEFAULT ('shelter') FOR [Type]
GO

ALTER TABLE [dbo].[SafetyPoints] ADD  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO

ALTER TABLE [dbo].[SafetyPoints] ADD  DEFAULT (sysutcdatetime()) FOR [UpdatedAt]
GO


--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

USE [SOSMap]
GO

/****** Object:  Table [dbo].[SOSReports]    Script Date: 12/10/2025 6:11:30 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[SOSReports](
	[Id] [uniqueidentifier] NOT NULL,
	[UserId] [uniqueidentifier] NOT NULL,
	[Name] [nvarchar](100) NULL,
	[Phone] [nvarchar](20) NULL,
	[Address] [nvarchar](255) NULL,
	[Status] [nvarchar](20) NOT NULL,
	[Level] [nvarchar](20) NOT NULL,
	[Details] [nvarchar](max) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

ALTER TABLE [dbo].[SOSReports] ADD  DEFAULT ('pending') FOR [Status]
GO

ALTER TABLE [dbo].[SOSReports] ADD  DEFAULT ('critical') FOR [Level]
GO

ALTER TABLE [dbo].[SOSReports] ADD  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO

ALTER TABLE [dbo].[SOSReports] ADD  DEFAULT (sysutcdatetime()) FOR [UpdatedAt]
GO

ALTER TABLE [dbo].[SOSReports]  WITH CHECK ADD FOREIGN KEY([UserId])
REFERENCES [dbo].[Users] ([Id])
GO


--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

USE [SOSMap]
GO

/****** Object:  Table [dbo].[Users]    Script Date: 12/10/2025 6:11:44 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[Users](
	[Id] [uniqueidentifier] NOT NULL,
	[Phone] [nvarchar](20) NOT NULL,
	[FullName] [nvarchar](100) NULL,
	[Role] [nvarchar](20) NOT NULL,
	[Status] [nvarchar](20) NOT NULL,
	[Address] [nvarchar](255) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[Phone] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE [dbo].[Users] ADD  DEFAULT ('citizen') FOR [Role]
GO

ALTER TABLE [dbo].[Users] ADD  DEFAULT ('active') FOR [Status]
GO

ALTER TABLE [dbo].[Users] ADD  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO

ALTER TABLE [dbo].[Users] ADD  DEFAULT (sysutcdatetime()) FOR [UpdatedAt]
GO


